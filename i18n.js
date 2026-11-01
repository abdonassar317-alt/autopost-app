// AutoPost — English / Arabic interface. Arabic is the source language; English is applied on the fly to interface text only
// (captions, post text and anything inside .cap / inputs / textareas is never touched).
(() => {
"use strict";
const KEY = "ap_lang";
const lang = (() => { try { return localStorage.getItem(KEY) || "ar"; } catch (e) { return "ar"; } })();
window.apLang = lang;

// ---- toggle (settings + header)
function addToggle() {
  const set = document.getElementById("settings");
  if (set && !document.getElementById("lang-box")) {
    const b = document.createElement("div"); b.className = "box"; b.id = "lang-box";
    b.innerHTML = `<div class="lbl" data-i18n-skip>اللغة · Language</div><div class="seg" data-i18n-skip><button data-l="ar" class="${lang === "ar" ? "on" : ""}">العربي</button><button data-l="en" class="${lang === "en" ? "on" : ""}">English</button></div>`;
    set.prepend(b); b.querySelectorAll("[data-l]").forEach(x => x.onclick = () => { try { localStorage.setItem(KEY, x.dataset.l); } catch (e) {} location.reload(); });
  }
  const hdr = document.getElementById("who")?.parentElement;
  if (hdr && !document.getElementById("lang-mini")) { const m = document.createElement("button"); m.id = "lang-mini"; m.setAttribute("data-i18n-skip", "");
    m.textContent = lang === "en" ? "ع" : "EN"; m.title = lang === "en" ? "العربي" : "English"; m.style.cssText = "border:1px solid var(--line);background:var(--s);color:var(--ink);border-radius:8px;padding:2px 8px;font:inherit;font-size:12px;cursor:pointer;margin-inline-start:8px";
    m.onclick = () => { try { localStorage.setItem(KEY, lang === "en" ? "ar" : "en"); } catch (e) {} location.reload(); }; hdr.appendChild(m); }
}
addToggle(); document.addEventListener("DOMContentLoaded", addToggle); setTimeout(addToggle, 500);
if (lang !== "en") return;

// ---- dates & numbers in English
for (const fn of ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"]) {
  const orig = Date.prototype[fn];
  Date.prototype[fn] = function (loc, opt) { return orig.call(this, loc === "ar-EG" ? "en-GB" : loc, opt); };
}
document.documentElement.lang = "en"; document.documentElement.dir = "ltr";

// ---- dictionary: Arabic interface phrase → English (longest phrases are matched first)
const D = {
// navigation & titles
"بوست جديد": "New post", "المجدول": "Scheduled", "الحسابات": "Accounts", "الإعدادات": "Settings", "جديد": "New",
"الجاي": "Upcoming", "تقويم": "Calendar", "مسودات": "Drafts", "أفكار": "Ideas", "اتنشر": "Published", "الكل": "All",
"شهر": "Month", "أسبوع": "Week", "سبت": "Sat", "حد": "Sun", "اتنين": "Mon", "تلات": "Tue", "أربع": "Wed", "خميس": "Thu", "جمعة": "Fri",
// compose
"الحساب": "Account", "الحملة": "Campaign", "اختياري — تجمّع البوستات اللي ليها هدف واحد": "optional — groups posts with one goal",
"مثلاً: سلسلة التصوير / عميل X نوفمبر": "e.g. Photo series / Client X November",
"الميديا": "Media", "الترتيب هو ترتيب الكاروسيل": "order = carousel order", "اختار صور أو فيديو": "Choose photos or a video", "لحد 10 صور، أو فيديو واحد": "up to 10 photos, or one video",
"الكابشن": "Caption", "اكتب الكابشن هنا": "Write the caption here", "كابشن مختلف لمنصة معينة (اختياري)": "Different caption for a platform (optional)",
"فاضي = نفس الكابشن الأساسي": "empty = same as main caption", "اختار المنصات الأول": "Choose platforms first",
"عنوان الفيديو على يوتيوب": "YouTube video title", "الميعاد": "Time", "المنصات": "Platforms",
"المنصات المكتوب جنبها «تذكير» هيوصلك على تليجرام في الميعاد الصور والكابشن جاهزين تنزلهم بنفسك": "Platforms marked “reminder” send you the files and caption on Telegram at post time so you can post them yourself.",
"تذكير": "reminder", "مش متصل": "not connected", "بينزل لوحده": "posts automatically", "بيوصلك على تليجرام تنشره بضغطة": "sent to Telegram, post in one tap", "اربطه من الحسابات": "connect it in Accounts",
"جدولة": "Schedule", "مسودة": "Draft", "نشر الآن": "Post now",
"قوالب": "Templates", "# هاشتاجات": "# Hashtags", "هاشتاجات": "Hashtags", "من المكتبة": "From library", "جدولة دفعة": "Batch schedule", "✨ مساعد": "✨ Assistant",
"مراجعة قبل الجدولة": "Pre-schedule check", "لازم تصلّح اللي بعلامة ✕ قبل الجدولة. تقدر تحفظها مسودة.": "Fix the items marked ✕ before scheduling. You can save it as a draft.",
"مفيش كابشن": "No caption", "يوتيوب: هيتعمل Short من الصور تلقائي (كل صورة 3.5 ثانية)": "YouTube: a Short will be made from the photos automatically (3.5 s per photo)",
"إنستجرام: اللينكات في الكابشن مش بتبقى قابلة للضغط": "Instagram: links in captions are not clickable",
"الفيديو عرضي — تيك توك وسناب بيفضّلوا الطولي 9:16": "Video is landscape — TikTok and Snapchat prefer vertical 9:16",
"الفيديو لسه مش مدعوم أوتوماتيك — هيوصلك تذكير": "video isn't supported automatically yet — you'll get a reminder",
"اختار منصة واحدة على الأقل": "Choose at least one platform", "ضيف صور أو فيديو": "Add photos or a video", "الفيديو لازم يبقى لوحده في البوست": "A video must be alone in its post",
"إنستجرام بيقبل لحد 10 صور": "Instagram accepts up to 10 photos", "اختار الميعاد": "Pick a time", "الميعاد ده فات": "That time has passed",
"الفيديو أكبر من 95 ميجا": "Video is larger than 95 MB", "مقاس صورة خارج نسب إنستجرام": "a photo is outside Instagram's ratios",
"هينزل في أول دورة خلال 15 دقيقة": "will go out in the next run within 15 minutes",
"اتحفظت مسودة": "Saved as draft", "بيتنشر دلوقتي": "Posting now", "اتجدول": "Scheduled",
"رجّعتلك آخر حاجة كنت بتكتبها": "Restored what you were writing", "صورة متكررة في البوست ده — شيل المتكرر": "duplicate photo(s) in this post — remove the duplicate",
// list
"مفيش بوستات هنا": "No posts here", "جاري التحميل…": "Loading…", "جاري التحميل": "Loading", "صور": "photos", "فيديو": "Video",
"تذكير ·": "reminder ·", "اتلغى": "cancelled", "فشل": "failed", "محتاج تدخل": "needs action", "هيتجرب تاني": "will retry",
"انشر على": "Post to", "نزّلته على": "Did you post it on", "الكابشن اتنسخ — الصقه في خانة الوصف": "Caption copied — paste it in the description",
"أيوه اتنشر": "Yes, posted", "لسه": "Not yet", "تمام ✅": "Done ✅",
"إعادة المحاولة": "Retry", "تغيير الميعاد": "Change time", "تعديل الكابشن": "Edit caption", "حذف البوست": "Delete post", "جدولة المسودة": "Schedule draft", "نسخة في بوست جديد": "Copy to a new post",
"الميعاد الجديد": "New time", "حفظ": "Save", "إلغاء": "Cancel", "تحذف البوست ده؟": "Delete this post?", "مش هتقدر ترجّعه بعد الحذف.": "You can't undo this.", "حذف": "Delete",
"اتعدل": "Updated", "اتحذف": "Deleted", "هيتجرب تاني خلال دقايق": "Will retry within minutes", "ميعاد غلط": "Invalid time",
"ميعاد النشر": "Post time", "اختار ميعاد جاي": "Pick a future time",
"المسودة دي من غير صور — اختار «نسخة في بوست جديد» وضيف الصور": "This draft has no photos — use “Copy to a new post” and add photos",
"بيجهّز النسخة…": "Preparing copy…", "النسخة جاهزة — عدّل وجدول": "Copy ready — edit and schedule",
"محتاجك دلوقتي": "Needs you now", "كله تمام ✓": "All good ✓", "الجاي:": "next:", "جرّب تاني": "Retry", "الحسابات ": "Accounts ",
"انشر دلوقتي": "Post now", "اتطلب النشر دلوقتي": "Publishing requested", "افتحها": "Open", "جدّد": "Renew",
"ميعاده عدّى ولسه ماتنشرش — GitHub ممكن يتأخر شوية": "is past its time and not posted yet — GitHub can be a little late",
"وقت النشر بإيدك على": "Time to post manually on", "لينكدإن: الربط انتهى": "LinkedIn: connection expired",
"اسحب البوست ليوم تاني عشان تغيّر ميعاده (نفس الساعة). على الموبايل: دوس عليه.": "Drag a post to another day to move it (same hour). On mobile: tap it.",
"مينفعش تنقله لميعاد فات": "Can't move it into the past", "نقل": "Move", "اتنقل": "Moved", "تراجع": "Undo",
"كل الحملات": "All campaigns", "تصدير": "Export", "استيراد": "Import", "تقرير شهري": "Monthly report", "رابط موافقة": "Approval link", "رد العميل": "Client reply",
// ideas
"فكرة جديدة": "New idea", "اكتب الفكرة بسرعة… (موضوع، زاوية، لينك مرجع)": "Jot the idea… (topic, angle, reference link)", "الحملة (اختياري)": "Campaign (optional)",
"إضافة": "Add", "اعملها بوست": "Make it a post", "الفكرة اتمسحت": "Idea deleted",
"مفيش أفكار لسه — اكتب أي حاجة تيجي في بالك وارجعلها بعدين": "No ideas yet — write anything down and come back to it later",
"الفكرة في البوست الجديد — ضيف الصور واحفظها مسودة أو جدولها": "Idea moved to New post — add photos, then save a draft or schedule",
// export / import / report
"الخطة اتنزلت — تتفتح في Excel أو Google Sheets": "Plan downloaded — opens in Excel or Google Sheets", "استيراد خطة": "Import plan", "استيراد كمسودات": "Import as drafts",
"لازم يبقى فيه عمود date وعمود caption": "It needs a date column and a caption column",
"تقرير شهري": "Monthly report", "صفحة نضيفة تبعتها للعميل: اللي اتنشر وروابطه. اطبعها واختار «Save as PDF».": "A clean page for your client: what was published and its links. Print it and choose “Save as PDF”.",
"افتح التقرير": "Open report", "المتصفح منع الصفحة — اسمح بالنوافذ المنبثقة": "The browser blocked the page — allow pop-ups",
// approval
"رابط موافقة للعميل": "Client approval link", "من": "From", "لحد": "To", "الرابط يشتغل لمدة": "Link works for", "3 أيام": "3 days", "أسبوعين": "2 weeks",
"رقم واتساب بتاعك (اختياري)": "Your WhatsApp number (optional)", "اعمل الرابط": "Create link", "بوست هيتبعت للمراجعة": "posts will be sent for review",
"مفيش بوستات جاية في الفترة دي": "No upcoming posts in this period", "رابط الموافقة جاهز ✓": "Approval link ready ✓", "ابعته واتساب": "Send on WhatsApp",
"تمام": "OK", "رد العميل": "Client reply", "تطبيق": "Apply", "مالقيتش الكود في الرسالة": "No code found in the message",
"الكود ناقص — اطلب من العميل يبعته تاني": "The code is incomplete — ask the client to send it again",
"البوستات دي مش لاقيها (ممكن اتمسحت أو الرابط قديم)": "Couldn't find these posts (deleted, or an old link)",
"اتوافق عليه": "approved", "محتاج تعديل": "need changes", "مستني موافقة العميل": "waiting for client approval", "العميل وافق": "client approved",
"تعديل مطلوب:": "Change requested:", "تعديل مطلوب على «": "Change requested on “", "بوست مستني موافقة العميل": "posts waiting for client approval",
"اتعدّل بعد موافقة العميل — محتاج موافقة تانية": "Edited after client approval — needs approval again", "العميل طلب تعديل": "Client requested a change",
// library / templates / batch
"قوالب الكابشن": "Caption templates", "مفيش قوالب لسه.": "No templates yet.", "احفظ الكابشن الحالي كقالب": "Save current caption as a template", "اسم القالب": "Template name",
"القالب اتحفظ": "Template saved", "اكتب اسم والكابشن مايبقاش فاضي": "Enter a name, and the caption can't be empty",
"مجموعات الهاشتاجات": "Hashtag groups", "مفيش مجموعات لسه.": "No groups yet.", "مجموعة جديدة": "New group", "الاسم (مثلاً: تصوير)": "Name (e.g. photography)", "اكتب الاسم والهاشتاجات": "Enter the name and the hashtags",
"مكتبة الملفات": "Media library", "دوّر بكلمة من الكابشن أو العنوان": "Search a word from the caption or title", "ضيف المختار للبوست": "Add selected to post", "اختار ملف": "Choose a file", "مفيش نتايج": "No results", "مجدول": "scheduled",
"ملفات في كل بوست": "Files per post", "كل كام يوم": "Every N days", "أول يوم": "First day", "الساعة": "Hour", "الكابشنز": "Captions",
"اختار كل الملفات مرة واحدة بالترتيب، وحدد كام ملف في كل بوست — هتشوف مراجعة قبل الحفظ.": "Pick all files at once in order and set how many go in each post — you'll review before saving.",
"مراجعة": "Review", "جدولة الكل": "Schedule all", "اختار الملفات": "Choose the files", "اختار منصات الأول": "Choose platforms first", "بيرفع…": "Uploading…",
// accounts
"اسم العميل / البراند": "Client / brand name", "حفظ الاسم": "Save name", "عميل جديد": "New client", "حذف العميل ده": "Delete this client", "اتحفظ": "Saved",
"كل عميل ليه صفحاته وتوكناته لوحده.": "Each client has its own pages and tokens.", "الاسم": "Name",
"إنستجرام": "Instagram", "فيسبوك": "Facebook", "صفحة فيسبوك": "Facebook Page", "لينكدإن": "LinkedIn", "يوتيوب": "YouTube", "تيك توك": "TikTok", "بنترست": "Pinterest", "سناب شات": "Snapchat", "تليجرام": "Telegram", "X (تويتر)": "X (Twitter)",
"متصل": "Connected", "اربط": "Connect", "تغيير": "Change", "تجديد": "Renew", "تغيير القناة": "Change channel", "صفحة؟": "Page?",
"الحساب الأساسي (Creator أو Business)": "Main account (Creator or Business)", "البروفايل الشخصي": "Personal profile",
"البروفايل الشخصي: بينزل عن طريق مشاركة إنستجرام التلقائية": "Personal profile: posted via Instagram's automatic sharing",
"ميتا بتشيّره على بروفايلك في فيسبوك": "Meta shares it to your Facebook profile", "بتنزل لوحدها لو اخترت «صفحة فيسبوك» في البوست": "posts automatically when you pick “Facebook Page”",
"للفيديوهات والشورتس بس": "videos and Shorts only", "قناة": "Channel",
"التقارير والتذكير شغالين": "reports and reminders on", "تقارير النشر + تذكير المنصات اليدوي": "post reports + manual-platform reminders",
"تذكير على تليجرام + زرار نشر بضغطة": "Telegram reminder + one-tap post button", "تذكير على تليجرام لحد ما تيك توك يوافق على التطبيق": "Telegram reminder until TikTok approves the app",
"تذكير على تليجرام · أو اربطه": "Telegram reminder · or connect it", "تذكير لحد ما بنترست يوافق (Standard access)": "reminder until Pinterest approves (Standard access)",
"تذكير على تليجرام + زرار نشر بضغطة (سناب مش بيسمح بالنشر الأوتوماتيك من غير موافقته)": "Telegram reminder + one-tap post (Snapchat doesn't allow auto-posting without its approval)",
"تذكير على تليجرام + زرار نشر بضغطة · النشر الأوتوماتيك مدفوع من X (~0.015$ للبوست)": "Telegram reminder + one-tap post · auto-posting is paid by X (~$0.015/post)",
"بيتجدد لما تفتح الأداة قبل": "renews when you open the app before", "لوحة": "board", "تنزل على أنهي لوحة؟": "Which board should it post to?",
"التوكن مش معاه صلاحية Secrets — عدّله من GitHub وخلي Secrets: Read and write.": "The token can't access Secrets — edit it on GitHub and set Secrets: Read and write.",
"اربط GitHub من الإعدادات الأول": "Connect GitHub in Settings first", "اربط GitHub الأول": "Connect GitHub first", "اربط حساب GitHub الأول": "Connect your GitHub account first",
"اتربط ✅": "connected ✅", "اتربط": "connected",
// settings
"تثبيت التطبيق": "Install the app", "ثبّت AutoPost على جهازك عشان يفتح زي أي تطبيق — أندرويد، آيفون، ويندوز وماك.": "Install AutoPost so it opens like any app — Android, iPhone, Windows and Mac.",
"تثبيت على الجهاز ده": "Install on this device", "الربط بـ GitHub": "GitHub connection", "البوستات بتتحفظ في ريبو خاص بيك على GitHub.": "Posts are saved in your private GitHub repo.",
"إزاي أعمل التوكن؟": "How do I create the token?", "اسم حسابك على GitHub": "Your GitHub username", "اسم الريبو الخاص": "Private repo name", "التوكن": "Token", "بيتحفظ على الجهاز ده بس": "saved on this device only",
"حفظ واختبار الاتصال": "Save & test connection", "جهاز جديد": "New device",
"اعمل رابط إعداد محمي بكلمة سر، افتحه على الجهاز التاني واكتب كلمة السر — من غير ما تعمل توكن تاني.": "Create a password-protected setup link, open it on the other device and type the password — no new token needed.",
"اعمل رابط إعداد": "Create setup link", "رابط إعداد لجهاز جديد": "Setup link for a new device", "اعمل الرابط": "Create link", "الرابط اتنسخ ✓": "Link copied ✓", "مشاركة": "Share",
"إعداد الجهاز ده": "Set up this device", "اكتب كلمة السر اللي عملت بيها الرابط": "Type the password you used for the link", "كلمة السر غلط": "Wrong password", "الجهاز اتظبط ✓": "Device set up ✓",
"منبّه النشر في ميعاده (مجاني)": "On-time publishing wake-up (free)", "إعداد المنبّه": "Set up wake-up", "منبّه النشر": "Publishing wake-up", "انسخ الكود": "Copy code", "قفل": "Close", "الكود اتنسخ ✓": "Code copied ✓",
"GitHub لوحده ممكن يتأخر ساعات. منبّه جوجل بيشيّك كل 5 دقايق وبيشغّل النشر في ميعاده بالظبط.": "GitHub alone can be hours late. A Google wake-up checks every 5 minutes and publishes exactly on time.",
"الذكاء الاصطناعي": "AI", "اختياري وببلاش": "optional, free", "مفتاح Gemini (اختياري)": "Gemini key (optional)", "حفظ واختبار": "Save & test",
"اللغة · Language": "Language · اللغة", "المظهر": "Appearance", "فاتح": "Light", "غامق": "Dark", "تلقائي": "Auto",
// AI
"✨ مساعد الكتابة": "✨ Writing assistant", "اكتب كابشن من الفكرة": "Write caption from idea", "حسّن الكابشن الحالي": "Improve current caption", "اختصره": "Shorten",
"5 بدايات (هوك)": "5 hooks", "نداء للتفاعل": "Call to action", "راجع الكابشن (أخطاء/وضوح)": "Review caption (errors/clarity)", "أسلوبي": "My style", "🎙 سجّل ملاحظة صوتية": "🎙 Record a voice note",
"مصري بسيط": "Simple Egyptian", "احترافي": "Professional", "حماسي": "Energetic", "تعليمي": "Educational", "قصير": "Short", "متوسط": "Medium", "طويل": "Long",
"النتيجة": "Result", "راجعها قبل الاستخدام": "review before using", "استخدمه بدل الكابشن": "Replace caption", "ضيفه تحت": "Add below", "انسخ": "Copy", "استخدمهم": "Use them",
"1. انسخ الطلب ده وافتح أي شات مجاني": "1. Copy this request and open any free chat", "2. الصق الرد هنا": "2. Paste the reply here", "كمّل": "Continue", "بيكتب…": "Writing…",
"اتحط في الكابشن — راجعه": "Put in the caption — review it", "اتنسخ — الصقه في الشات": "Copied — paste it in the chat", "اتنسخ": "Copied",
"اكتب الفكرة الأول": "Write the idea first", "مفيش كابشن أكتب فيه": "There's no caption to work on", "اكتب كابشن أو فكرة الأول": "Write a caption or idea first",
"✨ اقترح أفكار": "✨ Suggest ideas", "✨ خطة على قد وقتي": "✨ Plan for my time", "✨ نص طويل ← بوستات": "✨ Long text → posts", "اطلب": "Ask",
"ضيف المختار للأفكار": "Add selected to ideas", "اختار اللي عاجبك": "pick what you like", "مسح الأسلوب": "Clear style",
"الرد مش بالشكل المطلوب — اطلب منه يرجّع JSON بس": "The reply isn't in the expected format — ask it to return JSON only",
"محتاج إذن المايك": "Microphone permission needed", "الجهاز ده مش بيدعم التسجيل": "This device can't record", "ابدأ": "Start", "خلصت": "Done",

// wizards & long notes
"(Business أو Creator) ومربوط بصفحة الفيسبوك": "(Business or Creator) and linked to your Facebook Page",
"(زرار النسخ) والصقه هنا": "(copy button) and paste it here",
"(مشروع Apps Script جديد) وامسح اللي فيه والصق الكود (زرار النسخ تحت)": "(new Apps Script project), clear it and paste the code (copy button below)",
"هترجع هنا لوحدك.": "you'll come back here automatically.", "هترجع هنا لوحدك": "you'll come back here automatically",
"2. إنشاء رموز الوصول": "2. Generate access tokens",
"الحساب لازم يكون Creator أو Business — مرة واحدة بس": "The account must be Creator or Business — one time only",
"إضافة حساب": "Add account",
"اختار كلمة سر (8 حروف على الأقل). هتكتبها على الجهاز التاني. الرابط من غيرها مالوش لازمة.": "Choose a password (8+ characters). You'll type it on the other device. The link is useless without it.",
"Google Cloud ← العملاء": "Google Cloud ← Clients", "افتح تطبيقك ← انسخ": "Open your app ← copy",
"#تصوير #photography ...": "#photography #lighting ...",
"الصق مقالة، ملاحظات، سكريبت فيديو…": "Paste an article, notes, a video script…",
"عندك إيه جاهز؟ (صور، فيديوهات، مشاريع، مواضيع)": "What do you already have? (photos, videos, projects, topics)",
"الجمهور (مثلاً: سماسرة ومطورين في القاهرة)": "Audience (e.g. brokers and developers in Cairo)",
"الهدف (مثلاً: أجيب عملاء تصوير عقارات)": "Goal (e.g. get real-estate photography clients)",
"بوستات في الأسبوع": "posts per week", "ساعات في الأسبوع": "hours per week", "كلمة سر": "Password",
"الصق التوكن بين علامتين التنصيص في سطر": "Paste the token between the quotes on the line",
"النتيجة اقتراحات — بتتضاف لقائمة الأفكار لما تختارها، مش بتتنشر.": "These are suggestions — they're added to Ideas when you pick them, never published.",
"، واختار Use case:": ", and choose Use case:", "اتأكد إن حساب إنستجرام": "Make sure the Instagram account is", "اضغط": "press",
"اعمل توكن صغير:": "Create a small token:", "اكتب اسم التطبيق مثلاً": "Enter an app name, e.g.", "اكتب اسم للبوت، وبعدين يوزر بينتهي بـ": "Type a bot name, then a username ending in",
"العميل يشوف البوستات الجاية ويوافق أو يطلب تعديل — من غير حساب ومن غير سيرفر. البوستات اللي في الرابط": "Your client sees the upcoming posts and approves or requests changes — no account, no server. Posts in the link",
"انسخه": "copy it",
"بيقرا ملف واحد صغير كل 5 دقايق وبيشغّل النشر بس لما ييجي ميعاد بوست، فبيوفّر دقايق GitHub كمان.": "It reads one small file every 5 minutes and starts publishing only when a post is due, which also saves GitHub minutes.",
"بينشر على بروفايلك الشخصي — بيتجدد تلقائي كل ما تفتح الأداة قبل ما يخلص": "Posts to your personal profile — renews when you open the app before it expires",
"تخصيص": "Customize", "تضيفلها الصور بعدين.": "you add photos to later.", "تطبيقك على Meta for Developers": "your app on Meta for Developers", "تطبيقك ← المصادقة": "your app ← Auth",
"توكن البوت": "Bot token", "ثم": "then", "جنب الحساب ← انسخ التوكن": "next to the account ← copy the token", "حالات الاستخدام": "Use cases", "خطوتين بس": "Just two steps",
"دوس على قالب يتحط مكان المؤشر. استخدم {رقم} و{تاريخ} لو عايز.": "Tap a template to insert it at the cursor. You can use {n} for the number and {date} for the date.",
"ربط": "Connect", "ربط صفحة فيسبوك": "Connect Facebook Page", "ربط إنستجرام": "Connect Instagram", "ربط لينكدإن": "Connect LinkedIn", "ربط بنترست": "Connect Pinterest", "ربط تليجرام": "Connect Telegram",
"ربط تيك توك": "Connect TikTok", "ربط يوتيوب": "Connect YouTube", "ربط ببنترست": "Connect with Pinterest", "ربط بتيك توك": "Connect with TikTok", "ربط بجوجل": "Connect with Google", "ربط بلينكدإن": "Connect with LinkedIn",
"سر العميل الأساسي": "Primary client secret", "سماح": "Allow", "في": "in", "في تليجرام ← ابعت": "in Telegram ← send", "في التطبيق ضيف Redirect URI:": "In the app, add Redirect URI:",
"كابشن لكل بوست، افصل بينهم بسطر فيه --- بس. لو كابشن واحد هيتكرر. {رقم} = رقم البوست": "One caption per post, separated by a line with --- only. A single caption is repeated. {n} = post number",
"للصفحات بس — البروفايل الشخصي Meta مش بتسمح بالنشر عليه، فبيوصلك على تليجرام": "Pages only — Meta doesn't allow posting to personal profiles, so you get it on Telegram",
"مجاني. بس البنات بتفضل مخفية لحد ما بنترست يوافق على تطبيقك (Standard access) — لحد كده هيوصلك تذكير.": "Free. Pins stay hidden until Pinterest approves your app (Standard access) — until then you'll get a reminder.",
"مرة واحدة بس": "One time only", "مرة واحدة، 4 خطوات. كله مجاني وعلى حسابك.": "One time, 4 steps. All free and on your own account.", "مش بيتحفظ": "not saved",
"مش هتتنشر غير بعد موافقته": "won't be published until they approve",
"ملف CSV فيه الأعمدة: date, time, platforms, caption (واختياري: campaign, label). كل سطر هيبقى": "A CSV file with columns: date, time, platforms, caption (optional: campaign, label). Each row becomes a",
"من القايمة:": "from the menu:", "من فوق ←": "at the top ←", "هيبعتلك توكن شكله": "It sends you a token like",
"هيوصلك عليه تقرير كل بوست، وملفات تيك توك وسناب وX في ميعادها": "You'll get a report for every post here, plus TikTok, Snapchat and X files on time",
"و": "and", "واعمل تطبيق (حساب بنترست Business)": "and create an app (Pinterest Business account)", "والصقهم هنا ←": "and paste them here ←",
"وسجّل بحساب الإنستجرام (لو شخصي هيطلب منك تحوّله احترافي)": "and sign in with the Instagram account (if personal, it'll ask you to switch to professional)",
"وسجّل بحساب الفيسبوك اللي أدمن على الصفحة": "and sign in with the Facebook account that admins the Page",
"← اختار قناتك ← لو ظهر \"التطبيق لم يتم التحقق منه\" اضغط": "← choose your channel ← if you see \"app not verified\" press",
"← الصلاحيات متعلّمة (Actions: write) ←": "← permissions are pre-checked (Actions: write) ←", "← انسخه": "← copy it", "← نوع التطبيق": "← app type", "← وافق": "← approve",
"← وافق على الصلاحيات ← بعد ما يقول Done امسح التوكن من السطر واحفظ": "← accept the permissions ← after it says Done, delete the token from the line and save",
"← وافق ← هترجع هنا لوحدك": "← approve ← you'll come back here automatically",
"اكتب الفكرة أو ملاحظاتك هنا (أو سيبها فاضية لو هتشتغل على الكابشن الحالي)": "Write the idea or your notes (or leave empty to work on the current caption)",
"ببلاش من غير مفتاح: هيجهّزلك طلب تنسخه في أي شات مجاني.": "Free without a key: it prepares a request you paste into any free chat.",
"شغال بمفتاح Gemini المجاني بتاعك.": "Running on your free Gemini key.",
"مفيش حاجة بتتنشر لوحدها — النتيجة بتيجي هنا تراجعها.": "Nothing is published automatically — the result comes here for you to review.",
"من غير مفتاح: المساعد بيجهّز الطلب وانت تلصقه في أي شات مجاني. بمفتاح Gemini مجاني من": "Without a key: the assistant prepares the request and you paste it into any free chat. With a free Gemini key from",
"بيكتب جوه الأداة على طول. المفتاح بيتحفظ على الجهاز ده بس. اللي بتبعته بيروح لجوجل، وفي الخطة المجانية جوجل ممكن تستخدمه لتحسين منتجاتها — ماتحطش بيانات سرية.": "it writes right inside the app. The key is saved on this device only. What you send goes to Google, and on the free tier Google may use it to improve its products — don't include confidential data.",
// generic
"التالي": "Next", "رجوع": "Back", "افتح": "Open", "الصق": "Paste", "اختار": "Choose", "مش متاح": "not available", "آخر تحديث": "last updated",
"مشاهدة": "views", "وصول": "reach", "إعجاب": "likes", "تعليق": "comments", "حفظ ": "saves ", "تفاعلات": "interactions", "تفاعل (رياكت)": "reactions",
"نشر تلقائي": "auto-posted", "نشر يدوي": "posted manually", "بوست": "posts", "عندك": "You have", "اتضاف": "Added", "اتعمل": "Created", "يدوي": "manual",
};
// patterns for text with numbers/names
const P = [
  [/^عندك (\d+) مسودة$/, "You have $1 draft(s)"], [/^(\d+) بوست هيتبعت للمراجعة$/, "$1 post(s) will be sent for review"], [/^(\d+) بوست$/, "$1 posts"],
  [/^(\d+) صور$/, "$1 photos"], [/^(.+) · (\d+) صور$/, "$1 · $2 photos"], [/^اتجدول (\d+) بوست ✓$/, "Scheduled $1 posts ✓"], [/^اتضاف (\d+) فكرة$/, "Added $1 idea(s)"],
  [/^اتضاف (\d+) ملف$/, "Added $1 file(s)"], [/^اتعمل (\d+) مسودة ✓$/, "Created $1 draft(s) ✓"], [/^(\d+) سطر$/, "$1 rows"], [/^(\d+) اقتراح$/, "$1 suggestions"],
  [/^لينكدإن: الربط بيخلص بعد (\d+) يوم$/, "LinkedIn: connection expires in $1 day(s)"], [/^(\d+) موافق · (\d+) تعديل · (\d+) لسه$/, "$1 approved · $2 changes · $3 pending"],
  [/^✓ (\d+) اتوافق عليه · (\d+) محتاج تعديل$/, "✓ $1 approved · $2 need changes"], [/^(.+): فشل 3 مرات — (.*)$/, "$1: failed 3 times — $2"],
  [/^هينزل على لوحة (.*)$/, "Will post to board $1"], [/^يوتيوب بقى على قناة (.*) ✅$/, "YouTube now posts to $1 ✅"], [/^تقرير (.+)$/, "Report $1"], [/^حد (\d+)$/, "limit $1"], [/^نسخة لكل منصة \((\d+)\)$/, "Version per platform ($1)"],
  [/^صفحة (.+?) · بتنزل لوحدها لو اخترت «صفحة فيسبوك» في البوست$/, "Page $1 · posts automatically when you pick “Facebook Page”"], [/^صفحة (.+?) · بتنزل لوحدها$/, "Page $1 · posts automatically"],
];
const keys = Object.keys(D).filter(k => k.length > 2).sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const big = new RegExp("(?<![\\u0600-\\u06FF])(?:" + keys.map(esc).join("|") + ")(?![\\u0600-\\u06FF])", "g");
const AR = /[؀-ۿ]/;
function tr(t) {
  if (!AR.test(t)) return t;
  // anything the user wrote is shown inside «…» — never translate that part
  const s0 = t.trim(), s1 = s0.replace(/[.。]$/, ""); if (D[s0]) return t.replace(s0, D[s0]); if (D[s1]) return t.replace(s1, D[s1].replace(/[.]$/, ""));
  for (const [re, en] of P) if (re.test(s0)) return t.replace(s0, s0.replace(re, en));
  if (t.includes("«")) return t.split(/(«[^»]*»)/).map(x => x.startsWith("«") ? x : tr1(x)).join("");
  return tr1(t);
}
function tr1(t) {
  if (!AR.test(t)) return t;
  const s = t.trim(); if (D[s]) return t.replace(s, D[s]);
  for (const [re, en] of P) if (re.test(s)) return t.replace(s, s.replace(re, en));
  return t.replace(big, m => D[m]);
}
const SKIP = "textarea,input,select option[data-raw],.cap,.alt,.cp,[data-i18n-skip],script,style,#ai-out textarea,.ck";
function walk(root) {
  if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(SKIP)) { const n = tr(root.nodeValue); if (n !== root.nodeValue) root.nodeValue = n; } return; }
  if (root.nodeType !== 1 || root.closest?.("[data-i18n-skip],.cap,.alt,script,style")) return;
  for (const a of ["placeholder", "title", "aria-label"]) { const v = root.getAttribute?.(a); if (v && AR.test(v)) root.setAttribute(a, tr(v)); }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = tw.nextNode())) {
    if (n.nodeType === 1) { for (const a of ["placeholder", "title", "aria-label"]) { const v = n.getAttribute(a); if (v && AR.test(v)) n.setAttribute(a, tr(v)); } continue; }
    const p = n.parentElement; if (!p || p.closest(SKIP)) continue; const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
  }
}
const run = () => walk(document.body);
new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") walk(m.target); else m.addedNodes.forEach(walk); } })
  .observe(document.documentElement, { childList: true, subtree: true, characterData: true });
document.title = "AutoPost";
const css = document.createElement("style");
css.textContent = `#l-seg{overflow-x:auto;max-width:100%;scrollbar-width:none}#l-seg::-webkit-scrollbar{display:none}.sheet .p>button{text-align:left}html[dir=ltr] body{font-feature-settings:normal}`;
document.head.appendChild(css);
if (document.readyState !== "loading") run(); else document.addEventListener("DOMContentLoaded", run);
setTimeout(run, 800);
})();
