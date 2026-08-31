import { notFound } from "next/navigation";
import { AudioProvider } from "@/audio/AudioProvider";
import { isQaHarnessAvailable } from "@/domain/presentation/qaHarness";
import AudioLifecycleHarness from "./AudioLifecycleHarness";

export const dynamic = "force-dynamic";

export default function QaAudioPage() {
  if (!isQaHarnessAvailable(process.env.NEXT_PUBLIC_APP_ENV, process.env.NODE_ENV)) notFound();
  return <AudioProvider><AudioLifecycleHarness /></AudioProvider>;
}
