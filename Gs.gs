// --- ตั้งค่าระบบ ---
const SPREADSHEET_ID = "1-KCeoDZGWHlxf-JaZpTYo0GyKOwbhc1AnzUUDiQuqoA"; // ไอดีชีตของคุณ
const LINE_NOTIFY_TOKEN = ""; // ใส่ Line Notify Token (ถ้ามี)
const SCRIPT_NAME = "Shop & Game Store";

function doGet(e) {
  // รัน setupSystem ทุกครั้งที่มีการเปิดเว็บ เพื่อให้มั่นใจว่ามีชีตครบ
  setupSystem(); 
  
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle(SCRIPT_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// --- ฟังก์ชันจัดการ Google Sheets ---

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    throw new Error("ไม่สามารถเปิด Google Sheet ได้ กรุณาตรวจสอบสิทธิ์การเข้าถึง หรือ ID ของชีต: " + e.message);
  }
}

function setupSystem() {
  const ss = getSpreadsheet();
  
  // 1. ตรวจสอบและสร้างชีต Member
  let memberSheet = ss.getSheetByName("Member");
  if (!memberSheet) {
    memberSheet = ss.insertSheet("Member");
    // สร้างหัวข้อคอลัมน์
    memberSheet.appendRow(["Date", "Time", "LineID", "Email", "Country", "Phone", "OTP", "Password", "Status"]);
    // สร้างข้อมูลตัวอย่าง 5 แถว
    const dummyMembers = [
      [new Date(), "10:00", "line001", "user1@test.com", "Thailand", "0812345678", "", "pass1234", "Active"],
      [new Date(), "11:30", "line002", "user2@test.com", "Thailand", "0898765432", "", "123456", "Active"],
      [new Date(), "12:15", "line003", "user3@test.com", "Laos", "0205555555", "", "password", "Active"],
      [new Date(), "09:45", "line004", "user4@test.com", "Thailand", "0611111111", "", "abcd", "Banned"],
      [new Date(), "14:20", "line005", "user5@test.com", "Vietnam", "0909090909", "", "qwerty", "Active"]
    ];
    dummyMembers.forEach(r => memberSheet.appendRow(r));
  }

  // 2. ตรวจสอบและสร้างชีต Product
  let productSheet = ss.getSheetByName("Product");
  if (!productSheet) {
    productSheet = ss.insertSheet("Product");
    productSheet.appendRow(["Image", "Name", "Detail", "Price", "Discount", "Stock", "Sold"]);
    // ข้อมูลตัวอย่าง Product
    const dummyProducts = [
      ["https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500", "Gaming Laptop X1", "High performance gaming laptop", 45000, 5000, 10, 2],
      ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500", "Wireless Headphone", "Noise cancelling", 3500, 500, 50, 12],
      ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500", "Mechanical Keyboard", "RGB Blue Switch", 2900, 200, 30, 8],
      ["https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500", "Gaming Mouse", "16000 DPI", 1500, 0, 100, 45],
      ["https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500", "4K Monitor", "144Hz IPS Panel", 12000, 1000, 15, 5]
    ];
    dummyProducts.forEach(r => productSheet.appendRow(r));
  }

  // 3. ตรวจสอบและสร้างชีต Game
  let gameSheet = ss.getSheetByName("Game");
  if (!gameSheet) {
    gameSheet = ss.insertSheet("Game");
    gameSheet.appendRow(["Image", "Name", "Detail", "Items", "FreeItem", "Discount", "Sold"]);
    // ข้อมูลตัวอย่าง Game
    const dummyGames = [
      ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500", "ROV", "Mobile MOBA", "1000 Coupons", "Skin Box", 50, 100],
      ["https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=500", "Free Fire", "Battle Royale", "500 Diamonds", "Gun Skin", 0, 250],
      ["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500", "Genshin Impact", "Open World RPG", "300 Genesis Crystals", "-", 10, 50],
      ["https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500", "PUBG Mobile", "Battle Royale", "660 UC", "Outfit", 20, 80],
      ["https://images.unsplash.com/photo-1556438050-9488f08f11aa?w=500", "Valorant", "Tactical Shooter", "1000 VP", "Spray", 0, 30]
    ];
    dummyGames.forEach(r => gameSheet.appendRow(r));
  }
}

// --- API สำหรับ Frontend ---

function getShopData() {
  const ss = getSpreadsheet();
  
  // อ่านข้อมูล Product
  const pSheet = ss.getSheetByName("Product");
  const pData = pSheet.getDataRange().getValues();
  const products = pData.slice(1).map(r => ({
    image: r[0], name: r[1], detail: r[2], price: r[3], discount: r[4], stock: r[5], sold: r[6]
  }));
  
  // อ่านข้อมูล Game
  const gSheet = ss.getSheetByName("Game");
  const gData = gSheet.getDataRange().getValues();
  const games = gData.slice(1).map(r => ({
    image: r[0], name: r[1], detail: r[2], items: r[3], freeItem: r[4], discount: r[5], sold: r[6]
  }));

  return { products: products, games: games };
}

function sendOtpEmail(email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  CacheService.getScriptCache().put("OTP_" + email, otp, 300); // 5 นาที
  
  try {
    MailApp.sendEmail({
      to: email,
      subject: "รหัส OTP ร้านค้า Game Store",
      htmlBody: `<div style="text-align:center;">
        <h2>รหัสยืนยันตัวตน (OTP)</h2>
        <p style="font-size: 28px; font-weight: bold; color: #2563eb; letter-spacing: 5px;">${otp}</p>
        <p>รหัสนี้ใช้สำหรับการยืนยันตัวตนและมีอายุ 5 นาที</p>
      </div>`
    });
    return { success: true, message: "ส่งรหัส OTP เรียบร้อยแล้ว" };
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
  
  // เช็คอีเมลซ้ำ
  const emails = sheet.getRange(2, 4, Math.max(sheet.getLastRow()-1, 1), 1).getValues().flat();
  if (emails.includes(data.email)) {
    return { success: false, message: "อีเมลนี้มีในระบบแล้ว" };
  }
  
  // เช็ค OTP
  if (!verifyOtp(data.email, data.otp)) {
    return { success: false, message: "รหัส OTP ไม่ถูกต้อง" };
  }

  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Bangkok", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, "Asia/Bangkok", "HH:mm");

  sheet.appendRow([
    dateStr, timeStr, 
    data.lineId, data.email, data.country, data.phone, 
    data.otp, data.password, "Active"
  ]);

  if (LINE_NOTIFY_TOKEN) {
    sendLineNotify(`\n✨ สมัครสมาชิกใหม่\nEmail: ${data.email}\nLine: ${data.lineId}\nTel: ${data.phone}`);
  }

  return { success: true, message: "สมัครสมาชิกสำเร็จ" };
}

function loginUser(data) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Member");
  const users = sheet.getDataRange().getValues(); // ได้ Array 2 มิติ
  
  // Login Type: password
  if (data.type === 'password') {
    // วนลูปเริ่มแถวที่ 1 (ข้าม Header)
    for (let i = 1; i < users.length; i++) {
      // index 3 = Email, index 7 = Password
      if (users[i][3] == data.email && users[i][7] == data.password) {
         return { success: true, user: { email: users[i][3], lineId: users[i][2] } };
      }
    }
    return { success: false, message: "อีเมลหรือรหัสผ่านผิด" };
  }
  
  // Login Type: otp
  if (data.type === 'otp') {
    let userFound = false;
    let userData = {};
    for (let i = 1; i < users.length; i++) {
      if (users[i][3] == data.email) {
        userFound = true;
        userData = { email: users[i][3], lineId: users[i][2] };
        break;
      }
    }
    
    if (!userFound) return { success: false, message: "ไม่พบอีเมลในระบบ" };
    
    if (verifyOtp(data.email, data.otp)) {
      return { success: true, user: userData };
    } else {
      return { success: false, message: "OTP ไม่ถูกต้อง" };
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
