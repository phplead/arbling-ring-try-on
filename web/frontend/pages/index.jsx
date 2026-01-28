import { Page, Layout, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <Page narrowWidth>
      <TitleBar title="App Dashboard" />
      <Layout>
        <Layout.Section>
          <Text as="h2" variant="headingMd">
            Welcome to the app.
          </Text>
        </Layout.Section>
      </Layout>
    </Page>
  );
}