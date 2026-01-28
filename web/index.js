// web/index.js
// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js"; 
import PrivacyWebhookHandlers from "./privacy.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// ===================================================================
// Shopify Auth & Webhooks
// ===================================================================
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// ===================================================================
// Authenticated routes
// ===================================================================
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

// ===================================================================
// 3D Products with AR Tag Filter (GLB + "AR-Ring-Try-On" tag only)
// ===================================================================

app.get("/api/products/3d", async (req, res) => {
  const { after } = req.query;
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const query = `
    query getProductsWithGLB($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            title
            handle
            legacyResourceId
            totalInventory
            tags
            media(first: 10) {
              edges {
                node {
                  ... on Model3d {
                    id
                    sources {
                      url
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  try {
    const response = await client.request(query, {
      variables: {
        first: 50,
        after: after ? String(after) : null,
      },
    });

    const edges = response.data.products.edges || [];

    const filteredProducts = edges
      .map((edge) => {
        const node = edge.node;
        const mediaEdges = node.media?.edges || [];
        const tags = node.tags || [];

        const hasGLB = mediaEdges.some((m) =>
          m.node?.sources?.some((s) =>
            s.url?.toLowerCase().endsWith(".glb")
          )
        );

        const hasARTag = tags.includes("AR-Ring-Try-On");

        return (hasGLB && hasARTag)
          ? {
              id: node.id,
              title: node.title,
              handle: node.handle,
              legacyResourceId: node.legacyResourceId,
              totalInventory: node.totalInventory,
              cursor: edge.cursor,
            }
          : null;
      })
      .filter(Boolean);

    res.json({
      products: filteredProducts,
      pageInfo: response.data.products.pageInfo,
    });
  } catch (error) {
    console.error("Error fetching 3D products:", error);
    res.status(500).json({ error: "Failed to fetch 3D products" });
  }
});

// ===================================================================
// Secure Proxy: Generate signed URL for GLB (never expose in theme)
// ===================================================================

app.all("/proxy/signed-glb", async (req, res) => {
  const { media_id, shop } = req.query;

  if (!media_id || !shop) {
    return res.status(400).send("Missing parameters");
  }

  try {
    const sessionId = `offline_${shop}`;

    // FIXED: Use shopify.config.sessionStorage (not shopify.sessionStorage)
    const session = await shopify.config.sessionStorage.loadSession(sessionId);

    if (!session) {
      throw new Error("No offline session found for shop");
    }

    const client = new shopify.api.clients.Graphql({ session });

    const response = await client.request(`
      mutation fileCreateSignedUrl($input: FileCreateSignedUrlInput!) {
        fileCreateSignedUrl(input: $input) {
          signedUrl
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        input: {
          fileId: media_id,
          fileContentType: "MODEL_3D"
        }
      }
    });

    // const result = response.body.data?.fileCreateSignedUrl;

    // if (result?.userErrors?.length > 0) {
    //   console.error("GraphQL errors:", result.userErrors);
    //   return res.status(400).json({ errors: result.userErrors });
    // }

    // const signedUrl = result?.signedUrl;
    // if (!signedUrl) {
    //   throw new Error("No signed URL returned");
    // }

    // res.json({ url: signedUrl });
  } 
  
  catch (error) {
    console.error("App Proxy signed-glb error:", error);
    res.status(500).send("Failed to generate signed URL");
  }
  
});




// ===================================================================
// Serve static frontend files
// ===================================================================

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

// ===================================================================
// Catch-all: Render index.html with shop origin
// ===================================================================

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res) => {
  const shopOrigin = res.locals.shopify.session.shop;

  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
        .replace("%SHOP_ORIGIN%", shopOrigin)
    );
});

// ===================================================================
// Start server
// ===================================================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});