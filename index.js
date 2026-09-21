require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { chromium } = require('playwright-chromium');
const { Target, Snapshot } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// دالة تأخير مؤقت لحماية السكربت من الحظر
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. دالة سحب بيانات إنستجرام عبر Playwright
// ==========================================
async function checkInstagramAccount(targetUsername) {
  console.log(`\n[+] جاري بدء فحص الحساب: ${targetUsername}`);
  
  let browser;
  try {
    // تشغيل المتصفح مع إعدادات لتفادي كشف الـ Bot
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-US'
    });
    
    const page = await context.newPage();
    
    // الانتقال لرابط الحساب
    await page.goto(`https://www.instagram.com/${targetUsername}/`, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await delay(5000); // الانتظار للتأكد من تحميل العناصر

    // استخراج البيانات من Meta Tags الخاصة بالصفحة
    const pageData = await page.evaluate(() => {
      const metaDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
      const metaImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      
      let followersCount = 0;
      let followingCount = 0;
      let postsCount = 0;

      if (metaDescription) {
        // التحليل للنص المقروء مثل: "10M Followers, 500 Following, 1,200 Posts"
        const parts = metaDescription.split('-');
        if (parts.length > 0) {
          const stats = parts[0].split(',');
          stats.forEach(stat => {
            if (stat.includes('Followers')) followersCount = stat.replace(/[^0-9.]/g, '');
            if (stat.includes('Following')) followingCount = stat.replace(/[^0-9.]/g, '');
            if (stat.includes('Posts')) postsCount = stat.replace(/[^0-9.]/g, '');
          });
        }
      }

      return {
        followersCount: Number(followersCount) || 0,
        followingCount: Number(followingCount) || 0,
        postsCount: Number(postsCount) || 0,
        profilePicUrl: metaImage || ''
      };
    });

    console.log(`[+] البيانات المسحوبة لـ ${targetUsername}:`, pageData);

    // حفظ اللقطة الحقيقية في MongoDB
    await Snapshot.create({
      username: targetUsername,
      followersCount: pageData.followersCount,
      followingCount: pageData.followingCount,
      postsCount: pageData.postsCount,
      profilePicUrl: pageData.profilePicUrl
    });

    console.log(`✅ تم حفظ اللقطة الحقيقية بنجاح لـ ${targetUsername}!`);

  } catch (error) {
    console.error(`❌ حدث خطأ أثناء سحب حساب ${targetUsername}:`, error.message);
  } finally {
    if (browser) await browser.close();
  }
}

// ==========================================
// 2. دالة الفحص الشامل لجميع الحسابات النشطة
// ==========================================
async function runAllChecks() {
  console.log('⏰ بدء الجدولة الدورية للبحث عن التغييرات...');
  try {
    const targets = await Target.find({ isActive: true });
    
    if (targets.length === 0) {
      console.log('⚠️ لا يوجد حسابات مستهدفة في قاعدة البيانات حتى الآن.');
      return;
    }

    for (const target of targets) {
      await checkInstagramAccount(target.username);
      await delay(10000); // توقف 10 ثوانٍ بين كل حساب والتاني تجنباً للحظر
    }
  } catch (err) {
    console.error('❌ خطأ في تشغيل الجدولة:', err.message);
  }
}

// ==========================================
// 3. مسارات الـ Express API (Endpoints)
// ==========================================

// نقطة فحص عمل السيرفر
app.get('/', (req, res) => {
  res.send('🚀 Insta Tracker Server is up and running!');
});

// إضافة حساب جديد للمراقبة
app.post('/api/targets', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const newTarget = await Target.create({ username });
    res.status(201).json({ message: 'Target added successfully', target: newTarget });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تشغيل الفحص يدوياً عبر الطلب
app.get('/api/run-now', async (req, res) => {
  runAllChecks(); // تشغيل العملية في الخلفية
  res.json({ message: 'Inspection process started manually!' });
});

// ==========================================
// 4. الاتصال بـ Database وتشغيل السيرفر والجدولة
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // تشغيل السيرفر
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // جدولة المهمة لتشتغل تلقائياً (مثلاً: كل ساعة)
    cron.schedule('0 * * * *', () => {
      runAllChecks();
    });

  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });
