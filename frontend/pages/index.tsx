import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SchedulerForm = dynamic(() => import("../components/SchedulerForm"), { ssr: false });

export default function Home() {
  const [addr, setAddr] = useState<string>("");

  useEffect(()=>{
    setAddr(process.env.NEXT_PUBLIC_SCHEDULER || "");
  },[]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-6">⛽ ZeGas Scheduler</h1>
      {!addr ? (
        <p className="text-gray-600">Set <code>NEXT_PUBLIC_SCHEDULER</code> in <code>.env.local</code> to your deployed contract address.</p>
      ) : (
        <SchedulerForm schedulerAddress={addr} />
      )}
    </main>
  );
}
