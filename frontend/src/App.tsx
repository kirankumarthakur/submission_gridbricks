import { Layout } from "./layout/Layout";
import { DataProvider } from "./context/DataContext";

export default function App() {
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  );
}
