import { saveUploadedImage } from "@/lib/media";
import { can, staff } from "@/lib/staff";

export async function POST(request: Request) {
  const user = await staff();
  if (!user || !can(user.role, "catalog")) {
    return Response.json({ error: "Unauthorized." }, { status: 403 });
  }
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return Response.json({ error: "Invalid origin." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid origin." }, { status: 403 });
    }
  }
  try {
    const data = await request.formData();
    const files = data.getAll("file").filter((v): v is File => v instanceof File);
    if (!files.length) {
      return Response.json({ error: "Select an image file." }, { status: 400 });
    }
    const urls: string[] = [];
    for (const file of files.slice(0, 8)) {
      urls.push(await saveUploadedImage(file));
    }
    return Response.json({ urls });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not upload image.";
    return Response.json({ error: message }, { status: 400 });
  }
}
