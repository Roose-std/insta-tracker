require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { Target, Snapshot } = require('./models');
const { chromium } = require('playwright-chromium');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!'))
  .catch((err) => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. دالة الفحص
async function checkInstagramAccount(targetUsername) {
  console.log(`[+] جاري بدء فحص الحساب: ${targetUsername}`);
  
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    await page.goto(`https://www.instagram.com/${targetUsername}/`, { waitUntil: 'networkidle' });
    await delay(3000);

    console.log(`[+] تم الوصول لصفحة ${targetUsername} بنجاح.`);

    // تجريبياً
    const dummyFollowersList = ['user_a', 'user_b', 'user_c'];

    await Snapshot.create({
      username: targetUsername,
      followers: dummyFollowersList
    });

    console.log(`✅ تم حفظ اللقطة في قاعدة البيانات بنجاح!`);
  } catch (error) {
    console.error('❌ حدث خطأ أثناء السحب:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

// 3. جدولة المهمة لتشغيلها تلقائياً كل 12 ساعة
cron.schedule('0 */12 * * *', () => {
  console.log('⏰ حان موعد تشغيل الفحص الدوري...');
  checkInstagramAccount('instagram');
});

// 4. مسار رئيسي لتأكيد عمل السيرفر
app.get('/', (req, res) => {
  res.send('Instagram Tracker Server is Running 🚀');
});

// تشغيل السيرفر لضمان بقاء التطبيق حياً على Railway
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});
