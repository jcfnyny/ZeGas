import dynamic from "next/dynamic";
import { useState } from "react";

const SchedulerForm = dynamic(() => import("../components/SchedulerForm"), { ssr: false });
const ContractSelector = dynamic(() => import("../components/ContractSelector"), { ssr: false });

export default function Home() {
  const [addr, setAddr] = useState<string>("");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-4xl font-bold mb-2">⛽ ZeGas Scheduler</h1>
      <p className="text-gray-600 mb-8">Schedule Ethereum transactions for later execution</p>
      
      {!addr ? (
        <ContractSelector onAddressSelected={setAddr} />
      ) : (
        <div className="w-full max-w-md space-y-4">
          <SchedulerForm schedulerAddress={addr} />
        </div>
      )}
    </main>
  );
}
