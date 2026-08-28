import {listPublicSupportChannels} from "@/src/modules/support/server/repository";
export const dynamic="force-dynamic";
export async function GET(){return Response.json({channels:await listPublicSupportChannels()},{headers:{"Cache-Control":"public, max-age=60, stale-while-revalidate=300"}});}
