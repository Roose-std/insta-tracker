require('dotenv').config();
const mongoose = require('mongoose');
const { Target, Snapshot } = require('./models');
const { chromium } = require('playwright-chromium');

// 1. الاتصال بقاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!'))
  .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// دالة المحاكاة الزمنية للبشر
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. دالة جلب المتابعين من إنستغرام
async function checkInstagramAccount(targetUsername) {
  console.log(`[+] جاري بدء فحص الحساب: ${targetUsername}`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    // فتح صفحة الحساب
    await page.goto(`https://www.instagram.com/${targetUsername}/`, { waitUntil: 'networkidle' });
    await delay(3000);

    console.log(`[+] تم الوصول لصفحة ${targetUsername} بنجاح.`);

    // تجريبياً: حفظ لقطة مبدئية في قاعدة البيانات
    const dummyFollowersList = ['user_a', 'user_b', 'user_c']; // سيتم استبدالها بأسماء المتابعين الحقيقيين

    await Snapshot.create({
      username: targetUsername,
      followers: dummyFollowersList
    });

    console.log(`✅ تم حفظ اللقطة في قاعدة البيانات بنجاح!`);
    await browser.close();

  } catch (error) {
    console.error('❌ حدث خطأ أثناء السحب:', error.message);
    await browser.close();
  }
}

// تشغيل تجريبي للحساب
// استبدل 'instagram' بأي حساب عام تريد اختباره
checkInstagramAccount('instagram');
