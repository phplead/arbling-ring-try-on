// frontend/pages/3d-products.jsx - Updated to show Product ID instead of Handle
import { useState } from "react";
import {
  Page,
  Card,
  Layout,
  Text,
  Badge,
  Button,
  EmptyState,
  Spinner,
  DataTable,
  Stack,
  Tooltip,
} from "@shopify/polaris";
import { EditMinor } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { TitleBar } from "@shopify/app-bridge-react";

export default function ThreeDProductsPage() {
  const { t } = useTranslation();
  const [after, setAfter] = useState(null);

  const { data, isLoading, refetch } = useQuery(
    ["3dProducts", after],
    async () => {
      const params = new URLSearchParams();
      if (after) params.set("after", after);
      const res = await fetch(`/api/products/3d?${params}`);
      if (!res.ok) throw new Error(t("3DProducts.errors.fetch"));
      return res.json();
    },
    { keepPreviousData: true }
  );

  const products = data?.products ?? [];
  const hasNextPage = data?.pageInfo?.hasNextPage ?? false;

  // -----------------------------------------------------------------
  // Extract shop domain from URL params (embedded app safe)
  // -----------------------------------------------------------------
  const getShopDomain = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("shop") || window.shopOrigin || "ar-ring-try-on-viewer.myshopify.com"; // Fallback
  };

  // -----------------------------------------------------------------
  // Open product EDIT page in Shopify Admin (using numeric ID)
  // -----------------------------------------------------------------
  const openInAdmin = (legacyResourceId) => {
    const shop = getShopDomain();
    const adminUrl = `https://${shop}/admin/products/${legacyResourceId}`; // Direct edit URL
    window.top.location.href = adminUrl; // Redirect top frame
  };

  // -----------------------------------------------------------------
  // Table rows
  // -----------------------------------------------------------------
  const rows = products.map((p) => [
    // Product Name & ID (replaced handle with ID)
    <Stack vertical spacing="extraTight">
      <Text variant="bodyLg" fontWeight="semibold">
        {p.title}
      </Text>
      <Text tone="subdued" variant="bodySm">
        ID: {p.legacyResourceId}  {/* <-- Updated: Show numeric ID instead of handle */}
      </Text>
    </Stack>,

    // Inventory
    <Badge
      status={p.totalInventory > 0 ? "success" : "critical"}
      progress={p.totalInventory > 0 ? "complete" : "incomplete"}
    >
      {p.totalInventory} in stock
    </Badge>,

    // Actions
    <Stack spacing="tight">
      <Tooltip content={t("3DProducts.tooltips.editInAdmin")}>
        <Button
          size="slim"
          icon={EditMinor}
          primary
          onClick={() => openInAdmin(p.legacyResourceId)}
        >
          {t("3DProducts.actions.edit")}
        </Button>
      </Tooltip>
    </Stack>,
  ]);

  return (
    <Page fullWidth>
      <TitleBar title={t("3DProducts.pageTitle")} />

      <Layout>
        {/* ────────────────────────────── Header ────────────────────────────── */}
        <Layout.Section>
          <Card sectioned>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg">{t("3DProducts.sectionTitle")}</Text>
              <Button onClick={refetch} disabled={isLoading}>
                {t("3DProducts.actions.refresh")}
              </Button>
            </Stack>
          </Card>
        </Layout.Section>

        {/* ────────────────────────────── Main Table ────────────────────────────── */}
        <Layout.Section>
          <Card>
            {isLoading && !data ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "4rem 0",
                }}
              >
                <Spinner size="large" />
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                heading={t("3DProducts.empty.heading")}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate.svg"
                action={{
                  content: t("3DProducts.empty.action"),
                  onAction: refetch,
                }}
              >
                <p>{t("3DProducts.empty.description")}</p>
              </EmptyState>
            ) : (
              <>
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={[
                    <Text fontWeight="semibold">{t("3DProducts.table.product")}</Text>,
                    <Text fontWeight="semibold">{t("3DProducts.table.inventory")}</Text>,
                    <Text fontWeight="semibold">{t("3DProducts.table.actions")}</Text>,
                  ]}
                  rows={rows}
                  hoverable
                  increasedTableDensity
                  verticalAlign="middle"
                />

                {/* Pagination */}
                {hasNextPage && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "1.5rem",
                    }}
                  >
                    <Button
                      onClick={() =>
                        setAfter(products[products.length - 1].cursor ?? null)
                      }
                      loading={isLoading}
                    >
                      {t("3DProducts.actions.loadMore")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}