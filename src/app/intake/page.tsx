import { redirect } from "next/navigation";
import { FIRST_INTAKE_HREF } from "@/lib/journey";

/*
  /intake on its own is not a screen — it is the name of the whole
  wizard. Anyone landing here (or clicking "Tell us" in the progress
  strip) is sent to the first question.
*/
export default function IntakePage() {
  redirect(FIRST_INTAKE_HREF);
}
