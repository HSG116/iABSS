const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'constants.ts');
const originalContent = fs.readFileSync(filePath, 'utf8');

// 1. Prefix: Everything before the QUESTIONS_DB
const prefixEndIndex = originalContent.indexOf('export const QUESTIONS_DB: Question[] = [');
if (prefixEndIndex === -1) {
    console.error('Could not find QUESTIONS_DB');
    process.exit(1);
}
const prefix = originalContent.substring(0, prefixEndIndex);

// 2. The 100 Ramadan Questions (Hardcoded for total reliability)
const ramadanQuestions = [
    { id: 1, category: 'ramadan', text: 'ما هو العنصر الكيميائي الذي يرمز له بالرمز (Au)؟', options: ['الفضة', 'النحاس', 'الذهب', 'الألمنيوم'], correctIndex: 2 },
    { id: 2, category: 'ramadan', text: 'أين يقع تمثال الحرية؟', options: ['واشنطن', 'نيويورك', 'لوس أنجلوس', 'شيكاغو'], correctIndex: 1 },
    { id: 3, category: 'ramadan', text: 'كم عدد لاعبي فريق كرة القدم داخل الملعب؟', options: ['9 لاعبين', '10 لاعبين', '11 لاعباً', '12 لاعباً'], correctIndex: 2 },
    { id: 4, category: 'ramadan', text: 'ما هي الدولة التي تعتبر أكبر منتج للبن في العالم؟', options: ['كولومبيا', 'إثيوبيا', 'البرازيل', 'فيتنام'], correctIndex: 2 },
    { id: 5, category: 'ramadan', text: 'من هو الرسام الذي رسم لوحة "الموناليزا"؟', options: ['مايكل أنجلو', 'ليوناردو دافنشي', 'بيكاسو', 'فان جوخ'], correctIndex: 1 },
    { id: 6, category: 'ramadan', text: 'ما هو الغاز الذي يستخدم عادة في إطفاء الحرائق؟', options: ['الأكسجين', 'الهيدروجين', 'ثاني أكسيد الكربون', 'النيتروجين'], correctIndex: 2 },
    { id: 7, category: 'ramadan', text: 'ما هي عاصمة إيطاليا؟', options: ['ميلانو', 'روما', 'البندقية', 'نابولي'], correctIndex: 1 },
    { id: 8, category: 'ramadan', text: 'في أي قارة تقع دولة فلسطين؟', options: ['أفريقيا', 'أوروبا', 'آسيا', 'أستراليا'], correctIndex: 2 },
    { id: 9, category: 'ramadan', text: 'ما هو الحيوان الذي يُعرف بسفينة الصحراء؟', options: ['الحصان', 'الجمل', 'الفيل', 'الذئب'], correctIndex: 1 },
    { id: 10, category: 'ramadan', text: 'كم عدد ألوان قوس قزح؟', options: ['5 ألوان', '6 ألوان', '7 ألوان', '8 ألوان'], correctIndex: 2 },
    { id: 11, category: 'ramadan', text: 'من هو مخترع الطائرة؟', options: ['الأخوان رايت', 'جراهام بيل', 'توماس أديسون', 'إسحاق نيوتن'], correctIndex: 0 },
    { id: 12, category: 'ramadan', text: 'ما هي العملة المستخدمة في الكويت؟', options: ['الريال', 'الدرهم', 'الدينار', 'الليرة'], correctIndex: 2 },
    { id: 13, category: 'ramadan', text: 'ما هو أكبر طائر في العالم حالياً؟', options: ['النسر', 'النعامة', 'البطريق', 'الطاووس'], correctIndex: 1 },
    { id: 14, category: 'ramadan', text: 'ما هو الاسم القديم لمدينة القسطنطينية؟', options: ['إسطنبول', 'أنقرة', 'بيزنطة', 'أثينا'], correctIndex: 2 },
    { id: 15, category: 'ramadan', text: 'كم عدد أحرف اللغة العربية؟', options: ['26 حرفاً', '27 حرفاً', '28 حرفاً', '29 حرفاً'], correctIndex: 2 },
    { id: 16, category: 'ramadan', text: 'ما هو المعدن الذي يعتبر أفضل موصل للكهرباء؟', options: ['الذهب', 'النحاس', 'الفضة', 'الحديد'], correctIndex: 2 },
    { id: 17, category: 'ramadan', text: 'من هو القائد المسلم الذي فتح الأندلس؟', options: ['خالد بن الوليد', 'طارق بن زياد', 'صلاح الدين الأيوبي', 'عقبة بن نافع'], correctIndex: 1 },
    { id: 18, category: 'ramadan', text: 'ما هي الدولة التي عاصمتها "موسكو"؟', options: ['أوكرانيا', 'روسيا', 'بولندا', 'بيلاروسيا'], correctIndex: 1 },
    { id: 19, category: 'ramadan', text: 'ما هو الجزء الملون في عين الإنسان؟', options: ['الشبكية', 'القرنية', 'القزحية', 'البؤبؤ'], correctIndex: 2 },
    { id: 20, category: 'ramadan', text: 'كم سنة استمرت الحرب العالمية الأولى؟', options: ['3 سنوات', '4 سنوات', '5 سنوات', '6 سنوات'], correctIndex: 1 },
    { id: 21, category: 'ramadan', text: 'ما هو أسرع كوكب يدور حول الشمس؟', options: ['الأرض', 'المشتري', 'عطارد', 'نبتون'], correctIndex: 2 },
    { id: 22, category: 'ramadan', text: 'ما هي الدولة التي تشتهر بأكلة "البيتزا"؟', options: ['فرنسا', 'أمريكا', 'إيطاليا', 'تركيا'], correctIndex: 2 },
    { id: 23, category: 'ramadan', text: 'ما هو الاسم الكيميائي لملح الطعام؟', options: ['كلوريد الصوديوم', 'نترات البوتاسيوم', 'كبريتات الحديد', 'أكسيد المغنيسيوم'], correctIndex: 0 },
    { id: 24, category: 'ramadan', text: 'من هو النبي الذي ألقاه إخوته في البئر؟', options: ['موسى عليه السلام', 'يوسف عليه السلام', 'عيسى عليه السلام', 'يونس عليه السلام'], correctIndex: 1 },
    { id: 25, category: 'ramadan', text: 'ما هي أكبر بحيرة عذبة في أفريقيا؟', options: ['بحيرة ناصر', 'بحيرة تنجانيقا', 'بحيرة فيكتوريا', 'بحيرة طبريا'], correctIndex: 2 },
    { id: 26, category: 'ramadan', text: 'ما هو الشيء الذي يقرصك ولا تراه؟', options: ['البرد', 'الجوع', 'الحرارة', 'الظلام'], correctIndex: 1 },
    { id: 27, category: 'ramadan', text: 'ما هي عاصمة الهند؟', options: ['مومباي', 'نيودلهي', 'كلكتا', 'حيدر أباد'], correctIndex: 1 },
    { id: 28, category: 'ramadan', text: 'من هو مؤلف علم الجبر؟', options: ['ابن سينا', 'الخوارزمي', 'ابن الهيثم', 'الرازي'], correctIndex: 1 },
    { id: 29, category: 'ramadan', text: 'كم عدد عضلات جسم الإنسان تقريباً؟', options: ['206 عضلة', '400 عضلة', 'أكثر من 600 عضلة', '100 عضلة'], correctIndex: 2 },
    { id: 30, category: 'ramadan', text: 'ما هو الكوكب الذي يمتلك حلقات واضحة حوله؟', options: ['المريخ', 'زحل', 'الأرض', 'عطارد'], correctIndex: 1 },
    { id: 31, category: 'ramadan', text: 'في أي دولة تقع الأهرامات الثلاثة الشهيرة؟', options: ['السودان', 'المكسيك', 'مصر', 'بيرو'], correctIndex: 2 },
    { id: 32, category: 'ramadan', text: 'ما هو الحيوان الذي يستخرج منه المسك؟', options: ['الأسد', 'الغزال', 'الفيل', 'الحوت'], correctIndex: 1 },
    { id: 33, category: 'ramadan', text: 'كم يبلغ عدد ألوان علم دولة الإمارات العربية المتحدة؟', options: ['2', '3', '4', '5'], correctIndex: 2 },
    { id: 34, category: 'ramadan', text: 'من هو الصحابي الذي كانت تستحي منه الملائكة؟', options: ['عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب', 'أبو بكر الصديق'], correctIndex: 1 },
    { id: 35, category: 'ramadan', text: 'ما هو اسم أنثى الأسد؟', options: ['لبوة', 'مها', 'ناقة', 'فرس'], correctIndex: 0 },
    { id: 36, category: 'ramadan', text: 'ما هي الدولة التي تسمى "بلاد الرافدين"؟', options: ['سوريا', 'العراق', 'الأردن', 'لبنان'], correctIndex: 1 },
    { id: 37, category: 'ramadan', text: 'ما هو الغاز الذي تتنفسه النباتات في الليل؟', options: ['الأكسجين', 'ثاني أكسيد الكربون', 'النيتروجين', 'الهيليوم'], correctIndex: 0 },
    { id: 38, category: 'ramadan', text: 'أين أقيمت أول بطولة لكأس العالم لكرة القدم؟', options: ['البرازيل', 'إيطاليا', 'الأوروغواي', 'ألمانيا'], correctIndex: 2 },
    { id: 39, category: 'ramadan', text: 'كم عدد السجدات في القرآن الكريم؟', options: ['10 سجدات', '12 سجدة', '15 سجدة', '20 سجدة'], correctIndex: 2 },
    { id: 40, category: 'ramadan', text: 'ما هو العنصر الأساسي في صناعة الزجاج؟', options: ['الحديد', 'الرمل (السيليكا)', 'الخشب', 'البلاستيك'], correctIndex: 1 },
    { id: 41, category: 'ramadan', text: 'ما هي عاصمة أستراليا؟', options: ['سيدني', 'ملبورن', 'كانبرا', 'بيرث'], correctIndex: 2 },
    { id: 42, category: 'ramadan', text: 'ما هو الحيوان الذي يعتبر الأذكى بعد الإنسان (رئيسيات)؟', options: ['الدلفين', 'الشمبانزي', 'الفيل', 'الكلب'], correctIndex: 1 },
    { id: 43, category: 'ramadan', text: 'في أي مدينة يقع المسجد الأقصى؟', options: ['مكة', 'المدينة', 'القدس', 'الخليل'], correctIndex: 2 },
    { id: 44, category: 'ramadan', text: 'ما هي العملة الرسمية في المملكة المتحدة (بريطانيا)؟', options: ['اليورو', 'الدولار', 'الجنيه الإسترليني', 'الفرنك'], correctIndex: 2 },
    { id: 45, category: 'ramadan', text: 'ما هو المعدن الذي يكون سائلاً في درجة حرارة الغرفة؟', options: ['الحديد', 'الزئبق', 'النحاس', 'الذهب'], correctIndex: 1 },
    { id: 46, category: 'ramadan', text: 'من هو مكتشف قانون الجاذبية الأرضية؟', options: ['ألبرت أينشتاين', 'إسحاق نيوتن', 'جاليليو', 'داروين'], correctIndex: 1 },
    { id: 47, category: 'ramadan', text: 'ما هو الطائر الذي يضع أكبر بيضة؟', options: ['الدجاجة', 'النعامة', 'البطريق', 'العقاب'], correctIndex: 1 },
    { id: 48, category: 'ramadan', text: 'ما هي أكبر قارة في العالم من حيث المساحة؟', options: ['أفريقيا', 'أمريكا الشمالية', 'آسيا', 'أوروبا'], correctIndex: 2 },
    { id: 49, category: 'ramadan', text: 'ما هو اللقب الذي أطلق على زوجات النبي محمد ﷺ؟', options: ['الصحابيات', 'التابعيات', 'أمهات المؤمنين', 'المبشرات'], correctIndex: 2 },
    { id: 50, category: 'ramadan', text: 'كم عدد أرجل العنكبوت؟', options: ['4 أرجل', '6 أرجل', '8 أرجل', '10 أرجل'], correctIndex: 2 },
    { id: 51, category: 'ramadan', text: 'ما هو الشيء الذي كلما زاد نقص؟', options: ['المال', 'العمر', 'الماء', 'العلم'], correctIndex: 1 },
    { id: 52, category: 'ramadan', text: 'ما هي الدولة الوحيدة التي استخدمت القنبلة الذرية في الحرب؟', options: ['روسيا', 'ألمانيا', 'الولايات المتحدة', 'اليابان'], correctIndex: 2 },
    { id: 53, category: 'ramadan', text: 'ما هي عاصمة لبنان؟', options: ['دمشق', 'عمان', 'بيروت', 'بغداد'], correctIndex: 2 },
    { id: 54, category: 'ramadan', text: 'من هو "سيد الشهداء" في غزوة أحد؟', options: ['مصعب بن عمير', 'حمزة بن عبد المطلب', 'جعفر الطيار', 'عبد الله بن مسعود'], correctIndex: 1 },
    { id: 55, category: 'ramadan', text: 'كم عدد الأسنان اللبنية عند الطفل؟', options: ['20 سناً', '28 سناً', '32 سناً', '10 أسنان'], correctIndex: 0 },
    { id: 56, category: 'ramadan', text: 'ما هو البحر الذي لا يوجد به أسماك بسبب ملوحته الشديدة؟', options: ['البحر الأحمر', 'البحر الأبيض المتوسط', 'البحر الميت', 'البحر الأسود'], correctIndex: 2 },
    { id: 57, category: 'ramadan', text: 'من هو مخترع الديناميت الذي ندم وأسس جائزة للسلام؟', options: ['ألفريد نوبل', 'أينشتاين', 'ماري كوري', 'تسلا'], correctIndex: 0 },
    { id: 58, category: 'ramadan', text: 'ما هي عاصمة البرازيل؟', options: ['ريو دي جانيرو', 'ساو باولو', 'برازيليا', 'بوينس آيرس'], correctIndex: 2 },
    { id: 59, category: 'ramadan', text: 'ما هو اسم صوت الذئب؟', options: ['نباح', 'عواء', 'زئير', 'صهيل'], correctIndex: 1 },
    { id: 60, category: 'ramadan', text: 'كم عدد الدقائق في الساعة الواحدة؟', options: ['50 دقيقة', '60 دقيقة', '100 دقيقة', '24 دقيقة'], correctIndex: 1 },
    { id: 61, category: 'ramadan', text: 'أين تقع مدينة "البتراء" الأثرية؟', options: ['سوريا', 'العراق', 'الأردن', 'مصر'], correctIndex: 2 },
    { id: 62, category: 'ramadan', text: 'ما هو الغاز الذي نخرجه عند الزفير؟', options: ['الأكسجين', 'ثاني أكسيد الكربون', 'الهيدروجين', 'النيتروجين'], correctIndex: 1 },
    { id: 63, category: 'ramadan', text: 'من هي المرأة الوحيدة التي ذكر اسمها صراحة في القرآن الكريم؟', options: ['حواء', 'آسيا', 'مريم بنت عمران', 'خديجة'], correctIndex: 2 },
    { id: 64, category: 'ramadan', text: 'ما هي أكبر دولة من حيث عدد السكان (حالياً تتنافس مع الصين)؟', options: ['الولايات المتحدة', 'روسيا', 'الهند', 'إندونيسيا'], correctIndex: 2 },
    { id: 65, category: 'ramadan', text: 'ما هو الشيء الذي يكتب ولا يقرأ؟', options: ['الكتاب', 'القلم', 'النظارة', 'الهاتف'], correctIndex: 1 },
    { id: 66, category: 'ramadan', text: 'من هو مكتشف الدورة الدموية الصغرى؟', options: ['ابن سينا', 'ابن النفيس', 'ابن الهيثم', 'الرازي'], correctIndex: 1 },
    { id: 67, category: 'ramadan', text: 'ما هي العاصمة الإدارية لتركيا؟', options: ['إسطنبول', 'أنطاليا', 'أنقرة', 'إزمير'], correctIndex: 2 },
    { id: 68, category: 'ramadan', text: 'ما هو الحيوان الذي لا يشرب الماء طيلة حياته (يستخلصه من بذور)؟', options: ['الفأر', 'الجرذ الكنغري', 'الضب', 'الجمل'], correctIndex: 1 },
    { id: 69, category: 'ramadan', text: 'ما هو المعدن الذي ينجذب للمغناطيس؟', options: ['الألمنيوم', 'الذهب', 'الحديد', 'النحاس'], correctIndex: 2 },
    { id: 70, category: 'ramadan', text: 'كم عدد لاعبين فريق كرة السلة داخل الملعب؟', options: ['5 لاعبين', '6 لاعبين', '7 لاعبين', '11 لاعباً'], correctIndex: 0 },
    { id: 71, category: 'ramadan', text: 'ما هي الدولة التي تشبه الخريطة الحذاء (الجزمة)؟', options: ['إسبانيا', 'البرتغال', 'إيطاليا', 'اليونان'], correctIndex: 2 },
    { id: 72, category: 'ramadan', text: 'من هو أول إنسان وطأت قدماه سطح القمر؟', options: ['يوري جاجارين', 'نيل أرمسترونج', 'مايكل كولينز', 'باز ألدرين'], correctIndex: 1 },
    { id: 73, category: 'ramadan', text: 'ما هو أطول نهر في العالم؟', options: ['نهر النيل', 'نهر الأمازون', 'نهر المسيسيبي', 'نهر اليانغتسي'], correctIndex: 0 },
    { id: 74, category: 'ramadan', text: 'ما هو الحيوان الذي يسمى "ملك الغابة"؟', options: ['النمر', 'الفيل', 'الأسد', 'الدب'], correctIndex: 2 },
    { id: 75, category: 'ramadan', text: 'كم عدد الوان علم المملكة العربية السعودية؟', options: ['لون واحد', 'لونان (أخضر وأبيض)', '3 ألوان', '4 ألوان'], correctIndex: 1 },
    { id: 76, category: 'ramadan', text: 'ما هو الشيء الذي له عين ولا يرى؟', options: ['الإبرة', 'المسمار', 'القلم', 'الباب'], correctIndex: 0 },
    { id: 77, category: 'ramadan', text: 'ما هي عاصمة فرنسا؟', options: ['لندن', 'برلين', 'باريس', 'مدريد'], correctIndex: 2 },
    { id: 78, category: 'ramadan', text: 'ما هو العضو الذي يضخ الدم في الجسم؟', options: ['الكبد', 'الرئة', 'القلب', 'المعدة'], correctIndex: 2 },
    { id: 79, category: 'ramadan', text: 'من هو النبي الذي ابتلعه الحوت؟', options: ['يونس عليه السلام', 'موسى عليه السلام', 'نوح عليه السلام', 'أيوب عليه السلام'], correctIndex: 0 },
    { id: 80, category: 'ramadan', text: 'ما هو أسرع حيوان بحري؟', options: ['القرش', 'الحوت الأزرق', 'سمكة الزعنفة الشراعية (السمكة الشراعية)', 'الدولفين'], correctIndex: 2 },
    { id: 81, category: 'ramadan', text: 'ما هو الرقم الذي إذا ضربته في أي رقم آخر يكون الناتج صفراً؟', options: ['واحد', 'عشرة', 'صفر', 'خمسة'], correctIndex: 2 },
    { id: 82, category: 'ramadan', text: 'ما هي الدولة التي تشتهر بوجود "تاج محل"؟', options: ['باكستان', 'الهند', 'بنغلاديش', 'إيران'], correctIndex: 1 },
    { id: 83, category: 'ramadan', text: 'ما هو الحيوان الذي يستطيع تغيير لونه؟', options: ['الحرباء', 'الثعبان', 'الضفدع', 'السلحفاة'], correctIndex: 0 },
    { id: 84, category: 'ramadan', text: 'كم عدد سور القرآن الكريم؟', options: ['110', '112', '114', '120'], correctIndex: 2 },
    { id: 85, category: 'ramadan', text: 'ما هي عاصمة ألمانيا؟', options: ['ميونخ', 'هامبورغ', 'برلين', 'فرانكفورت'], correctIndex: 2 },
    { id: 86, category: 'ramadan', text: 'ما هو الشيء الذي ليس له بداية ولا نهاية؟', options: ['الخط المستقيم', 'الدائرة', 'المثلث', 'المربع'], correctIndex: 1 },
    { id: 87, category: 'ramadan', text: 'من هو الصحابي الذي نام في فراش النبي ﷺ ليلة الهجرة؟', options: ['أبو بكر الصديق', 'عمر بن الخطاب', 'علي بن أبي طالب', 'عثمان بن عفان'], correctIndex: 2 },
    { id: 88, category: 'ramadan', text: 'ما هو الذهب الأسود؟', options: ['الفحم', 'الحديد', 'البترول (النفط)', 'القهوة'], correctIndex: 2 },
    { id: 89, category: 'ramadan', text: 'كم عدد أرجل النملة؟', options: ['4 أرجل', '6 أرجل', '8 أرجل', '10 أرجل'], correctIndex: 1 },
    { id: 90, category: 'ramadan', text: 'ما هي أكبر جزيرة في العالم؟', options: ['مدغشقر', 'جرينلاند', 'بريطانيا', 'اليابان'], correctIndex: 1 },
    { id: 91, category: 'ramadan', text: 'من هو الشاعر الملقب بـ "متنبي"؟', options: ['أحمد بن الحسين', 'أحمد شوقي', 'نزار قباني', 'جرير'], correctIndex: 0 },
    { id: 92, category: 'ramadan', text: 'ما هي الدولة التي عاصمتها "طوكيو"؟', options: ['الصين', 'كوريا', 'اليابان', 'فيتنام'], correctIndex: 2 },
    { id: 93, category: 'ramadan', text: 'ما هو الشيء الذي تحمله ويحملك؟', options: ['الحذاء', 'الحقيبة', 'السيارة', 'القبعة'], correctIndex: 0 },
    { id: 94, category: 'ramadan', text: 'ما هو الفيتامين الذي نستمده من أشعة الشمس؟', options: ['فيتامين C', 'فيتامين A', 'فيتامين D', 'فيتامين B'], correctIndex: 2 },
    { id: 95, category: 'ramadan', text: 'ما هي عاصمة المغرب؟', options: ['الدار البيضاء', 'فاس', 'الرباط', 'مراكش'], correctIndex: 2 },
    { id: 96, category: 'ramadan', text: 'من هو أول الخلفاء الراشدين؟', options: ['عمر بن الخطاب', 'علي بن أبي طالب', 'أبو بكر الصديق', 'عثمان بن عفان'], correctIndex: 2 },
    { id: 97, category: 'ramadan', text: 'ما هي اللغة الأكثر تحدثاً في العالم (كلغة أم)؟', options: ['الإنجليزية', 'العربية', 'الصينية (الماندرين)', 'الإسبانية'], correctIndex: 2 },
    { id: 98, category: 'ramadan', text: 'ما هو الطائر الذي يعتبر رمزاً للحكمة؟', options: ['الصقر', 'البومة', 'الغراب', 'الهدهد'], correctIndex: 1 },
    { id: 99, category: 'ramadan', text: 'ما هو الشيء الذي يوجد في وسط باريس؟', options: ['برج إيفل', 'حرف الراء (ر)', 'نهر السين', 'متحف اللوفر'], correctIndex: 1 },
    { id: 100, category: 'ramadan', text: 'ما هو الكوكب الذي نعيش عليه؟', options: ['المريخ', 'الزهرة', 'الأرض', 'زحل'], correctIndex: 2 },
];

function formatQ(q) {
    return `  { id: ${q.id}, category: '${q.category}', text: '${q.text.replace(/'/g, "\\'")}', options: [${q.options.map(o => `'${o.replace(/'/g, "\\'")}'`).join(', ')}], correctIndex: ${q.correctIndex} },`;
}

// 3. Extract other categories from the current file
const categories = [
    { name: 'movies', startId: 201 },
    { name: 'cars', startId: 251 },
    { name: 'islamic', startId: 301 },
    { name: 'football', startId: 351 },
    { name: 'animals', startId: 401 },
    { name: 'gaming', startId: 451 },
    { name: 'anime', startId: 501 },
    { name: 'history', startId: 551 },
    { name: 'science', startId: 601 },
    { name: 'saudi', startId: 651 },
    { name: 'technology', startId: 701 },
    { name: 'music', startId: 751 }
];

const dbContent = originalContent.substring(prefixEndIndex);
const allQuestionsPart = [];

// Header for Ramadan
allQuestionsPart.push('  // فوازير رمضان (100 سؤال)');
ramadanQuestions.forEach(q => allQuestionsPart.push(formatQ(q)));

// Process other categories
const categoryHeaders = {
    'movies': '// أفلام ومسلسلات (30 سؤال)',
    'cars': '// عالم السيارات (30 سؤال)',
    'islamic': '// إسلاميات (30 سؤال)',
    'football': '// كرة قدم (30 سؤال)',
    'animals': '// عالم الحيوان (30 سؤال)',
    'gaming': '// ألعاب فيديو (30 سؤال)',
    'anime': '// أنمي ومانجا (30 سؤال)',
    'history': '// تاريخ (30 سؤال)',
    'science': '// علوم (30 سؤال)',
    'saudi': '// ثقافة سعودية (30 سؤال)',
    'technology': '// تكنولوجيا (30 سؤال)',
    'music': '// موسيقى وفنون (30 سؤال)'
};

categories.forEach(cat => {
    // Find questions for this category in the current file
    const regex = new RegExp(`{ id: \\d+, category: '${cat.name}', text: '.*?', options: \\[.*?\\], correctIndex: \\d+ }`, 'g');
    const matches = dbContent.match(regex);

    if (matches) {
        allQuestionsPart.push('');
        allQuestionsPart.push(`  ${categoryHeaders[cat.name] || `// ${cat.name}`}`);
        matches.forEach((m, idx) => {
            if (idx < 30) { // Keep only 30 per category
                const reindexed = m.replace(/id: \d+/, `id: ${cat.startId + idx}`);
                allQuestionsPart.push(`  ${reindexed},`);
            }
        });
    }
});

const finalContent = prefix + 'export const QUESTIONS_DB: Question[] = [\n' + allQuestionsPart.join('\n') + '\n];\n';

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Constants.ts has been successfully rebuilt with 100 Ramadan questions and cleaned categories.');
