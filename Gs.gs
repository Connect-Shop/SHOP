// --- ตั้งค่าระบบ ---
const SPREADSHEET_ID = "1-KCeoDZGWHlxf-JaZpTYo0GyKOwbhc1AnzUUDiQuqoA"; // ไอดีชีตของคุณ
const LINE_NOTIFY_TOKEN = ""; // ใส่ Line Notify Token (ถ้ามี)
const SCRIPT_NAME = "Shop & Game Store";

function doGet(e) {
  setupSystem(); 
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle(SCRIPT_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- ฟังก์ชันจัดการ Google Sheets ---
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    throw new Error("ไม่สามารถเปิด Google Sheet ได้ (ID: " + SPREADSHEET_ID + ") " + e.message);
  }
}

function setupSystem() {
  const ss = getSpreadsheet();
  
  // 1. ตรวจสอบและสร้างชีต Member
  let memberSheet = ss.getSheetByName("Member");
  if (!memberSheet) {
    memberSheet = ss.insertSheet("Member");
    memberSheet.appendRow(["Date", "Time", "LineID", "Email", "Country", "Phone", "OTP", "Password", "Status"]);
    memberSheet.appendRow([new Date(), "10:00", "line001", "user1@test.com", "Thailand", "0812345678", "123456", "pass1234", "Active"]);
  }

  // 2. ตรวจสอบและสร้างชีต Product
  let productSheet = ss.getSheetByName("Product");
  if (!productSheet) {
    productSheet = ss.insertSheet("Product");
    productSheet.appendRow(["Image", "Name", "Detail", "Price", "Discount", "Stock", "Sold"]);
    const dummyProducts = [
      ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500", "Gaming Laptop X1", "RAM 16GB SSD 512GB", 45000, 5000, 10, 2],
      ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", "Wireless Headphone", "Noise Cancelling", 3500, 500, 50, 12],
      ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500", "Mechanical Keyboard", "Blue Switch RGB", 2900, 200, 30, 8],
      ["https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500", "Gaming Mouse", "Wireless 16000 DPI", 1500, 0, 100, 45],
      ["https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500", "4K Monitor 27\"", "IPS 144Hz", 12000, 1000, 15, 5]
    ];
    dummyProducts.forEach(r => productSheet.appendRow(r));
  }

  // 3. ตรวจสอบและสร้างชีต Game
  let gameSheet = ss.getSheetByName("Game");
  if (!gameSheet) {
    gameSheet = ss.insertSheet("Game");
    gameSheet.appendRow(["Image", "Name", "Detail", "Items", "FreeItem", "Discount", "Sold"]);
    const dummyGames = [
      ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500", "ROV", "Garena RoV", "1000 Coupons", "Skin Box", 50, 100],
      ["https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=500", "Free Fire", "Battle Royale", "500 Diamonds", "Gun Skin", 0, 250],
      ["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500", "Genshin Impact", "miHoYo", "300 Genesis Crystals", "-", 10, 50],
      ["https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500", "PUBG Mobile", "Tencent", "660 UC", "Outfit Box", 20, 80],
      ["https://images.unsplash.com/photo-1556438050-9488f08f11aa?w=500", "Valorant", "Riot Games", "1000 VP", "Spray", 0, 30]
    ];
    dummyGames.forEach(r => gameSheet.appendRow(r));
  }
}

// --- API ---

function getShopData() {
  const ss = getSpreadsheet();
  const pData = ss.getSheetByName("Product").getDataRange().getValues().slice(1);
  const gData = ss.getSheetByName("Game").getDataRange().getValues().slice(1);
  
  return {
    products: pData.map(r => ({ image: r[0], name: r[1], detail: r[2], price: r[3], discount: r[4], stock: r[5], sold: r[6] })),
    games: gData.map(r => ({ image: r[0], name: r[1], detail: r[2], items: r[3], freeItem: r[4], discount: r[5], sold: r[6] }))
  };
}

function sendOtpEmail(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  CacheService.getScriptCache().put("OTP_" + email, otp, 300); 
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: "รหัส OTP ยืนยันตัวตน",
      htmlBody: `<div style="background:#f3f4f6; padding:20px; text-align:center;">
        <div style="background:#fff; padding:30px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
          <h2 style="color:#333;">รหัส OTP ของคุณ</h2>
          <h1 style="color:#2563eb; font-size:40px; letter-spacing:5px; margin:20px 0;">${otp}</h1>
          <p style="color:#666;">รหัสนี้มีอายุการใช้งาน 5 นาที</p>
        </div>
      </div>`
    });
    return { success: true, message: "ส่งรหัส OTP ไปที่อีเมลแล้ว" };
  } catch (e) {
    return { success: false, message: "ส่งเมลไม่สำเร็จ: " + e.message };
  }
}

function verifyOtp(email, inputOtp) {
  const cachedOtp = CacheService.getScriptCache().get("OTP_" + email);
  return (cachedOtp && cachedOtp === inputOtp);
}

function registerUser(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Member");
  
  const emails = sheet.getRange(2, 4, Math.max(sheet.getLastRow()-1, 1), 1).getValues().flat();
  const cleanEmail = String(data.email).trim().toLowerCase();
  
  if (emails.map(e => String(e).trim().toLowerCase()).includes(cleanEmail)) {
    return { success: false, message: "อีเมลนี้มีผู้ใช้งานแล้ว" };
  }
  
  if (!verifyOtp(data.email, data.otp)) {
    return { success: false, message: "รหัส OTP ไม่ถูกต้อง หรือหมดอายุ" };
  }

  const now = new Date();
  sheet.appendRow([
    Utilities.formatDate(now, "Asia/Bangkok", "yyyy-MM-dd"),
    Utilities.formatDate(now, "Asia/Bangkok", "HH:mm"),
    String(data.lineId).trim() || "-", 
    String(data.email).trim(), 
    data.country, 
    data.phone, 
    data.otp, 
    String(data.password).trim(), 
    "Active"
  ]);

  if (LINE_NOTIFY_TOKEN) {
    sendLineNotify(`\n👤 สมาชิกใหม่!\nEmail: ${data.email}\nCountry: ${data.country}`);
  }

  return { success: true, message: "สมัครสมาชิกสำเร็จ" };
}

function loginUser(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Member");
  const users = sheet.getDataRange().getValues();
  
  // แปลงข้อมูล input เป็น string และ trim
  const inputPassword = String(data.password).trim();
  const inputOtp = String(data.otp).trim();

  // กรณี Login ด้วย Email/User + Password
  if (data.type === 'email_password') {
    const inputIdentifier = String(data.identifier).trim().toLowerCase();
    for (let i = 1; i < users.length; i++) {
      let sheetLineId = String(users[i][2]).trim().toLowerCase();
      let sheetEmail = String(users[i][3]).trim().toLowerCase();
      let sheetPassword = String(users[i][7]).trim();

      if ((sheetEmail == inputIdentifier || sheetLineId == inputIdentifier) && sheetPassword == inputPassword) {
         return { success: true, user: { email: users[i][3], lineId: users[i][2], country: users[i][4] } };
      }
    }
    return { success: false, message: "ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง" };
  }
  
  // กรณี Login ด้วย เบอร์โทรศัพท์ (Phone + Country + Password)
  if (data.type === 'phone_password') {
    const inputCountry = String(data.country).trim().toLowerCase();
    const inputPhone = String(data.phone).trim();
    
    for (let i = 1; i < users.length; i++) {
      let sheetCountry = String(users[i][4]).trim().toLowerCase();
      let sheetPhone = String(users[i][5]).trim();
      let sheetPassword = String(users[i][7]).trim();

      if (sheetCountry == inputCountry && sheetPhone == inputPhone && sheetPassword == inputPassword) {
         return { success: true, user: { email: users[i][3], lineId: users[i][2], country: users[i][4] } };
      }
    }
    return { success: false, message: "ประเทศ เบอร์โทรศัพท์ หรือ รหัสผ่าน ไม่ถูกต้อง" };
  }
  
  // กรณี Login ด้วย OTP
  if (data.type === 'otp') {
    const inputEmail = String(data.identifier).trim().toLowerCase();
    let userData = null;
    for (let i = 1; i < users.length; i++) {
      let sheetEmail = String(users[i][3]).trim().toLowerCase();
      if (sheetEmail == inputEmail) {
        userData = { email: users[i][3], lineId: users[i][2], country: users[i][4] };
        break;
      }
    }
    
    if (!userData) return { success: false, message: "ไม่พบอีเมลในระบบ" };
    
    if (verifyOtp(inputEmail, inputOtp)) {
      return { success: true, user: userData };
    } else {
      return { success: false, message: "รหัส OTP ไม่ถูกต้อง" };
    }
  }
}

function sendLineNotify(msg) {
  try {
    UrlFetchApp.fetch("https://notify-api.line.me/api/notify", {
      "method": "post",
      "payload": { "message": msg },
      "headers": { "Authorization": "Bearer " + LINE_NOTIFY_TOKEN }
    });
  } catch(e) {}
}
