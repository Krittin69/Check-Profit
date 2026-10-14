
export default async (request: Request) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });

  if (request.method !== "POST") {
    return json({ success: false, message: "ใช้ POST เท่านั้น" }, 405);
  }

  const apiKey = Netlify.env.get("SLIPOK_API_KEY");
  const branchId = Netlify.env.get("SLIPOK_BRANCH_ID");

  if (!apiKey || !branchId) {
    return json({
      success: false,
      message: "ยังไม่ได้ตั้งค่า SlipOK ใน Netlify",
    }, 500);
  }

  try {
    const incoming = await request.formData();
    const file = incoming.get("files");
    const amount = Number(incoming.get("amount"));

    if (!(file instanceof File) || file.size === 0) {
      return json({
        success: false,
        message: "กรุณาแนบรูปสลิป",
      }, 400);
    }

    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      return json({
        success: false,
        message: "ไฟล์ต้องเป็นรูปภาพและมีขนาดไม่เกิน 10 MB",
      }, 400);
    }

    if (![39, 49, 59].includes(amount)) {
      return json({
        success: false,
        message: "ยอดเงินไม่ถูกต้อง",
      }, 400);
    }

    const body = new FormData();
    body.append("files", file, file.name);
    body.append("amount", String(amount));
    body.append("log", "true");

    const response = await fetch(
      `https://api.slipok.com/api/line/apikey/${branchId}`,
      {
        method: "POST",
        headers: { "x-authorization": apiKey },
        body,
      }
    );

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      return json({
        success: false,
        message: result.message || "ตรวจสอบสลิปไม่สำเร็จ",
      }, 400);
    }

    return json({
      success: true,
      message: "SlipOK ตรวจสอบสลิปผ่าน",
      data: result.data,
    });
  } catch {
    return json({
      success: false,
      message: "เกิดข้อผิดพลาด กรุณาลองใหม่",
    }, 500);
  }
};
