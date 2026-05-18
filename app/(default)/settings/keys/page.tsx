import KeyWrapper from "@/components/key-wrapper";

export const metadata = {
  title: "Nøgler"
}

export default function RewrapManagementPage() {

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Administrer enhedsnøgler</h1>
        <p className="text-gray-600">Manage rewrapping of encrypted data with new device keys</p>
      </div>
      <KeyWrapper />
    </div>
  );
}
