import { LetterQuestion } from '../types';

/**
 * LEVEL SYSTEM:
 * - Levels 1-20:   🟢 عالم المبتدئين  (أسئلة سهلة)
 * - Levels 21-40:  🔵 عالم المتمرن   (أسئلة متوسطة)
 * - Levels 41-60:  🟠 عالم المحترف   (أسئلة صعبة)
 * - Levels 61-80:  🔴 عالم الأبطال   (أسئلة صعبة جداً)
 * - Levels 81-100: 🟣 عالم الأساطير  (أسئلة للخبراء)
 *
 * Each question answer MUST start with the same letter as the 'letter' field.
 */
export const LETTER_GAME_QUESTIONS: LetterQuestion[] = [

    // ══════════════════════════════════════════════════════════
    // 🟢 WORLD 1 - Levels 1-20 - عالم المبتدئين (Easy)
    // ══════════════════════════════════════════════════════════

    // Level 1 - أساسيات الحياة
    { id: 101, letter: 'أ', question: 'نبي ابتلعه الحوت؟', answer: 'أيوب لا - يونس عليه السلام', level: 1 },
    { id: 102, letter: 'ب', question: 'حيوان كبير في القطب الجنوبي لا يطير؟', answer: 'بطريق', level: 1 },
    { id: 103, letter: 'ت', question: 'فاكهة حمراء تُستخدم في السلطات؟', answer: 'طماطم', level: 1 },
    { id: 104, letter: 'ث', question: 'حيوان ماكر في الغابة بذيل طويل؟', answer: 'ثعلب', level: 1 },
    { id: 105, letter: 'ج', question: 'حيوان سفينة الصحراء؟', answer: 'جمل', level: 1 },
    { id: 106, letter: 'ح', question: 'حيوان يصهل وله حافر؟', answer: 'حصان', level: 1 },
    { id: 107, letter: 'خ', question: 'خضار طويل أخضر اللون يُأكل نيئاً؟', answer: 'خيار', level: 1 },
    { id: 108, letter: 'د', question: 'حيوان يعيش في الغابة يأكل العسل؟', answer: 'دب', level: 1 },
    { id: 109, letter: 'ذ', question: 'معدن أصفر ثمين يُصنع منه المجوهرات؟', answer: 'ذهب', level: 1 },
    { id: 110, letter: 'ر', question: 'عضو في الجسم مسؤول عن التنفس؟', answer: 'رئة', level: 1 },
    { id: 111, letter: 'ز', question: 'حيوان طويل العنق منقط بالبقع؟', answer: 'زرافة', level: 1 },
    { id: 112, letter: 'س', question: 'شخصية كرتونية تعيش في أناناسة في البحر؟', answer: 'سبونج بوب', level: 1 },
    { id: 113, letter: 'ش', question: 'مصدر الضوء والحرارة للأرض؟', answer: 'شمس', level: 1 },
    { id: 114, letter: 'ص', question: 'طائر جارح سريع يُستخدم في الصيد؟', answer: 'صقر', level: 1 },
    { id: 115, letter: 'ض', question: 'حيوان برمائي أخضر يقفز؟', answer: 'ضفدع', level: 1 },
    { id: 116, letter: 'ط', question: 'طائر ملون يرقص وينفش ريشه؟', answer: 'طاووس', level: 1 },
    { id: 117, letter: 'ظ', question: '"خيالي" يتبعك ويظهر حين تشرق الشمس؟', answer: 'ظل', level: 1 },
    { id: 118, letter: 'ع', question: 'فاكهة حلوة تتدلى في عناقيد؟', answer: 'عنب', level: 1 },
    { id: 119, letter: 'غ', question: 'طائر أسود يصدر نعيقاً مزعجاً؟', answer: 'غراب', level: 1 },
    { id: 120, letter: 'ف', question: 'أكبر حيوان بري في العالم بخرطوم طويل؟', answer: 'فيل', level: 1 },
    { id: 121, letter: 'ق', question: 'قنديل السماء الذي يُضيء الليل؟', answer: 'قمر', level: 1 },
    { id: 122, letter: 'ك', question: 'حيوان أسترالي يحمل صغيره في جراب؟', answer: 'كنغر', level: 1 },
    { id: 123, letter: 'ل', question: 'عاصمة بريطانيا؟', answer: 'لندن', level: 1 },
    { id: 124, letter: 'م', question: 'أول كوكب أقرب للشمس؟', answer: 'مركوري (عطارد)', level: 1 },
    { id: 125, letter: 'ن', question: 'حشرة تنتج العسل؟', answer: 'نحلة', level: 1 },
    { id: 126, letter: 'هـ', question: 'طائر مذكور في القرآن أرسله سليمان رسولاً؟', answer: 'هدهد', level: 1 },
    { id: 127, letter: 'و', question: 'عاصمة الولايات المتحدة الأمريكية؟', answer: 'واشنطن', level: 1 },
    { id: 128, letter: 'ي', question: 'عملة اليابان الرسمية؟', answer: 'ين', level: 1 },

    // Level 2 - الحيوانات والطبيعة
    { id: 201, letter: 'أ', question: 'أكبر قارة في العالم مساحةً؟', answer: 'آسيا', level: 2 },
    { id: 202, letter: 'ب', question: 'عاصمة فرنسا تشتهر ببرجها الحديدي؟', answer: 'باريس', level: 2 },
    { id: 203, letter: 'ت', question: 'حيوان زاحف ضخم بجلد صلب وفك خطير؟', answer: 'تمساح', level: 2 },
    { id: 204, letter: 'ث', question: 'ما يتساقط من السماء أبيض بارد في الشتاء؟', answer: 'ثلج', level: 2 },
    { id: 205, letter: 'ج', question: 'جنس من الأشجار الاستوائية يُنتج الموز؟', answer: 'جنس الموز', level: 2 },
    { id: 206, letter: 'ح', question: 'حشرة تُضيء في الليل كالمصباح الطبيعي؟', answer: 'حشرة اليراعة', level: 2 },
    { id: 207, letter: 'خ', question: 'عاصمة السودان؟', answer: 'خرطوم', level: 2 },
    { id: 208, letter: 'د', question: 'وحدة زمنية 60 منها تساوي ساعة؟', answer: 'دقيقة', level: 2 },
    { id: 209, letter: 'ذ', question: 'حشرة طائرة تنقل الأمراض وصوتها مزعج؟', answer: 'ذبابة', level: 2 },
    { id: 210, letter: 'ر', question: 'عاصمة إيطاليا مدينة قديمة عريقة؟', answer: 'روما', level: 2 },
    { id: 211, letter: 'ز', question: 'طبقة في الجو تحمينا من أشعة الشمس الضارة؟', answer: 'زجاج الأوزون (طبقة الأوزون)', level: 2 },
    { id: 212, letter: 'س', question: 'كوكب له حلقات ظاهرة في الفضاء؟', answer: 'ساتورن (زحل)', level: 2 },
    { id: 213, letter: 'ش', question: 'مشروب ساخن يُحضَّر من الأوراق؟', answer: 'شاي', level: 2 },
    { id: 214, letter: 'ص', question: 'عاصمة اليمن؟', answer: 'صنعاء', level: 2 },
    { id: 215, letter: 'ض', question: 'أكثر حيوان في الفيل الأفريقي الضخم؟', answer: 'ضخامة (وزن 6 أطنان)', level: 2 },
    { id: 216, letter: 'ط', question: 'وسيلة تنقل جوية تحمل الركاب؟', answer: 'طائرة', level: 2 },
    { id: 217, letter: 'ظ', question: 'حيوان بري رشيق يشبه الغزال بقرون؟', answer: 'ظبي', level: 2 },
    { id: 218, letter: 'ع', question: 'أطول برج في العالم يقع في دبي؟', answer: 'عمارة برج خليفة', level: 2 },
    { id: 219, letter: 'غ', question: 'مدينة إسبانية شهيرة بقصر الحمراء؟', answer: 'غرناطة', level: 2 },
    { id: 220, letter: 'ف', question: 'فاكهة استوائية صفراء يحبها القرود؟', answer: 'فاكهة الموز', level: 2 },
    { id: 221, letter: 'ق', question: 'قائد فتح الأندلس؟', answer: 'قائد طارق بن زياد', level: 2 },
    { id: 222, letter: 'ك', question: 'جهاز إلكتروني يُعالج البيانات؟', answer: 'كمبيوتر', level: 2 },
    { id: 223, letter: 'ل', question: 'سائل يُفرزه الفم لهضم الطعام؟', answer: 'لعاب', level: 2 },
    { id: 224, letter: 'م', question: 'مشروب ساخن بني اللون محبوب عالمياً؟', answer: 'مشروب القهوة', level: 2 },
    { id: 225, letter: 'ن', question: 'نهر يعتبر أطول نهر في العالم؟', answer: 'نهر النيل', level: 2 },
    { id: 226, letter: 'هـ', question: 'غاز خفيف يملأ المناطيد ليرتفع؟', answer: 'هيليوم', level: 2 },
    { id: 227, letter: 'و', question: 'وحدة قياس الطاقة الكهربائية؟', answer: 'واط', level: 2 },
    { id: 228, letter: 'ي', question: 'يوم تعطل فيه معظم الناس في نهاية الأسبوع؟', answer: 'يوم العطلة (الجمعة)', level: 2 },

    // Level 3 - الجغرافيا والتاريخ
    { id: 301, letter: 'أ', question: 'أول الخلفاء الراشدين في الإسلام؟', answer: 'أبو بكر الصديق', level: 3 },
    { id: 302, letter: 'ب', question: 'برج مشهور في إيطاليا يميل بزاوية؟', answer: 'برج بيزا', level: 3 },
    { id: 303, letter: 'ت', question: 'عاصمة المملكة التركية؟', answer: 'تركيا (أنقرة)', level: 3 },
    { id: 304, letter: 'ث', question: 'غدة تشبه الفراشة توجد في الرقبة؟', answer: 'ثايرويد (الغدة الدرقية)', level: 3 },
    { id: 305, letter: 'ج', question: 'جزيرة عملاقة في شمال الأطلسي عاصمتها ريكيافيك؟', answer: 'جزيرة آيسلندا', level: 3 },
    { id: 306, letter: 'ح', question: 'حضارة بنت الأهرامات في مصر؟', answer: 'حضارة المصريين القدماء', level: 3 },
    { id: 307, letter: 'خ', question: 'خليج عربي في الجهة الشرقية للجزيرة العربية؟', answer: 'خليج العرب (الفارسي)', level: 3 },
    { id: 308, letter: 'د', question: 'دولة عاصمتها أمستردام مشهورة بالبخارزينات؟', answer: 'دولة هولندا', level: 3 },
    { id: 309, letter: 'ذ', question: 'ذرة أساسية تُكوِّن كل مادة في الكون؟', answer: 'ذرة الكيمياء (أتوم)', level: 3 },
    { id: 310, letter: 'ر', question: 'رياضي برتغالي يُلقَّب بـ CR7؟', answer: 'رونالدو', level: 3 },
    { id: 311, letter: 'ز', question: 'زعيم مغولي أسس أكبر إمبراطورية في التاريخ؟', answer: 'زعيم جنكيز خان', level: 3 },
    { id: 312, letter: 'س', question: 'سفينة أمريكية حملت أول إنسان إلى القمر؟', answer: 'ساتورن 5 (أبولو 11)', level: 3 },
    { id: 313, letter: 'ش', question: 'شجرة تُنتج زيتاً معروفاً يعيش آلاف السنين؟', answer: 'شجرة الزيتون', level: 3 },
    { id: 314, letter: 'ص', question: 'صحراء الضخمة في شمال أفريقيا؟', answer: 'صحراء الكبرى', level: 3 },
    { id: 315, letter: 'ض', question: 'ضاحية الشرق الأوسط المشهورة بالبنايات الشاهقة؟', answer: 'ضاحية دبي', level: 3 },
    { id: 316, letter: 'ط', question: 'طائر أبيض كبير يمشي على ساق واحدة بالأهوار؟', answer: 'طائر الغرنوق (نوع)', level: 3 },
    { id: 317, letter: 'ظ', question: 'ظاهرة تجعل الأرض دافئة حول الشمس؟', answer: 'ظاهرة الاحتباس الحراري', level: 3 },
    { id: 318, letter: 'ع', question: 'عالم إيطالي التاريخي أثبت دوران الأرض؟', answer: 'عالم جاليليو', level: 3 },
    { id: 319, letter: 'غ', question: 'غابة استوائية ضخمة في البرازيل رئة الأرض؟', answer: 'غابة الأمازون', level: 3 },
    { id: 320, letter: 'ف', question: 'فيلسوف قديم مؤسس علم المنطق والفلسفة؟', answer: 'فيلسوف أرسطو', level: 3 },
    { id: 321, letter: 'ق', question: 'قارة الثلج التي يحظر السكن فيها؟', answer: 'قارة أنتاركتيكا', level: 3 },
    { id: 322, letter: 'ك', question: 'كوكب أحمر يُسمى الكوكب الأحمر؟', answer: 'كوكب المريخ', level: 3 },
    { id: 323, letter: 'ل', question: 'لاعب أرجنتيني يلقب بالبرغوث فاز بالكأس الذهبية؟', answer: 'ليونيل ميسي', level: 3 },
    { id: 324, letter: 'م', question: 'ملك مغولي قائد عظيم غزا نصف الكرة الأرضية؟', answer: 'ملك جنكيز خان', level: 3 },
    { id: 325, letter: 'ن', question: 'نبي الله الذي شق له البحر بأمر الله؟', answer: 'نبي موسى عليه السلام', level: 3 },
    { id: 326, letter: 'هـ', question: 'هرم ضخم يُعد من عجائب الدنيا السبع القديمة؟', answer: 'هرم الجيزة الأكبر', level: 3 },
    { id: 327, letter: 'و', question: 'وادٍ في فلسطين معروف بحوادث تاريخية كثيرة؟', answer: 'وادي الأردن', level: 3 },
    { id: 328, letter: 'ي', question: 'يونيفرسال: شركة أمريكية لصناعة أفلام؟', answer: 'يونيفرسال بكتشرز', level: 3 },

    // ══════════════════════════════════════════════════════════
    // 🔵 WORLD 2 - Levels 21-40 - عالم المتمرن (Medium)
    // ══════════════════════════════════════════════════════════

    // Level 21 - العلوم والطبيعة
    { id: 2101, letter: 'أ', question: 'أطول سلسلة جبال في العالم في أمريكا الجنوبية؟', answer: 'أنديز', level: 21 },
    { id: 2102, letter: 'ب', question: 'بكتيريا تُسبب مرض السل اكتشفها عالم ألماني؟', answer: 'بكتيريا المتفطرة (كوخ)', level: 21 },
    { id: 2103, letter: 'ت', question: 'تأثير يجعل القمر يبدو أكبر عند الأفق؟', answer: 'تأثير قمر الأفق (وهم بصري)', level: 21 },
    { id: 2104, letter: 'ث', question: 'ثاني أطول نهر في أوروبا بعد الفولغا؟', answer: 'ثاني نهر (الدانوب)', level: 21 },
    { id: 2105, letter: 'ج', question: 'جهاز يحوّل الطاقة الحرارية إلى ميكانيكية؟', answer: 'جهاز المحرك الحراري (توربين)', level: 21 },
    { id: 2106, letter: 'ح', question: 'حفرة ضخمة في الأرض تكوّنت من نيزك؟', answer: 'حفرة النيزك (أريزونا)', level: 21 },
    { id: 2107, letter: 'خ', question: 'خلية في جسم الإنسان تحمل المعلومات الوراثية؟', answer: 'خلية DNA', level: 21 },
    { id: 2108, letter: 'د', question: 'دورة الماء في الطبيعة تُسمى بالدورة؟', answer: 'دورة الهيدرولوجية', level: 21 },
    { id: 2109, letter: 'ذ', question: 'ذرة مشعة تُستخدم في الطب لعلاج السرطان؟', answer: 'ذرة الراديوم (كوري)', level: 21 },
    { id: 2110, letter: 'ر', question: 'رسالة كيميائية تنتقل بين الخلايا العصبية؟', answer: 'رسالة الناقل العصبي', level: 21 },
    { id: 2111, letter: 'ز', question: 'زلزال قياسه على سلم ريختر 9 درجات؟', answer: 'زلزال مدمر (كاتاستروفيك)', level: 21 },
    { id: 2112, letter: 'س', question: 'سرعة الضوء في الفراغ تقريباً؟', answer: 'سرعة 300,000 كم/ث', level: 21 },
    { id: 2113, letter: 'ش', question: 'شكل هندسي لحضوره في الطبيعة بكثرة (نحل، ثلج)؟', answer: 'شكل سداسي', level: 21 },
    { id: 2114, letter: 'ص', question: 'صوت لا يستطيع الإنسان سماعه لتردده العالي؟', answer: 'صوت فوق الصوتي (الترا سوند)', level: 21 },
    { id: 2115, letter: 'ض', question: 'ضوء الشمس يتحول في النباتات إلى غذاء بعملية؟', answer: 'ضوء تركيب (البناء الضوئي)', level: 21 },
    { id: 2116, letter: 'ط', question: 'طبقة الغلاف الجوي الأقرب للأرض؟', answer: 'طبقة التروبوسفير', level: 21 },
    { id: 2117, letter: 'ظ', question: 'ظاهرة طبيعية تُنتج صوتاً مدوياً مع البرق؟', answer: 'ظاهرة الرعد', level: 21 },
    { id: 2118, letter: 'ع', question: 'عنصر كيميائي رمزه Fe يُستخدم في البناء؟', answer: 'عنصر الحديد', level: 21 },
    { id: 2119, letter: 'غ', question: 'غاز يُسبب الإغماء لو استنشقته بكثرة؟', answer: 'غاز أول أكسيد الكربون', level: 21 },
    { id: 2120, letter: 'ف', question: 'فيزيائي ألماني صاغ نظرية النسبية؟', answer: 'فيزيائي أينشتاين', level: 21 },
    { id: 2121, letter: 'ق', question: 'قوة جاذبية اكتشفها نيوتن بسقوط التفاحة؟', answer: 'قوة الجاذبية الأرضية', level: 21 },
    { id: 2122, letter: 'ك', question: 'كيمياء تدرس المواد وتفاعلاتها؟', answer: 'كيمياء الجريمة (الكيمياء الجنائية)', level: 21 },
    { id: 2123, letter: 'ل', question: 'لطم الطيور للهواء بأجنحتها يُسمى؟', answer: 'لف الجناح (الرفرفة)', level: 21 },
    { id: 2124, letter: 'م', question: 'مجرة نسكن فيها تُسمى؟', answer: 'مجرة درب التبانة', level: 21 },
    { id: 2125, letter: 'ن', question: 'نيتروجين يمثل كم بالمئة من الهواء؟', answer: 'نسبة 78%', level: 21 },
    { id: 2126, letter: 'هـ', question: 'هيدروجين وأكسوجين عند اتحادهما يُكوّنان؟', answer: 'هيدروكسيد الماء (H2O)', level: 21 },
    { id: 2127, letter: 'و', question: 'وحدة قياس الشدة للصوت تُسمى؟', answer: 'وحدة الديسيبل', level: 21 },
    { id: 2128, letter: 'ي', question: 'يورانيوم عنصر مشع يُستخدم وقوداً نووياً؟', answer: 'يورانيوم-235', level: 21 },

    // ══════════════════════════════════════════════════════════
    // 🟠 WORLD 3 - Levels 41-60 - عالم المحترف (Hard)
    // ══════════════════════════════════════════════════════════

    // Level 41 - التاريخ والحضارات
    { id: 4101, letter: 'أ', question: 'إمبراطورية سقطت عام 453م أمام الأتراك في القسطنطينية؟', answer: 'إمبراطورية بيزنطة', level: 41 },
    { id: 4102, letter: 'ب', question: 'بحيرة غرينلانية أعمق وأقدم بحيرة عذبة في العالم؟', answer: 'بحيرة بايكال (روسيا)', level: 41 },
    { id: 4103, letter: 'ت', question: 'تكنولوجيا تُستخدم لتحديد المواقع عبر الأقمار الصناعية؟', answer: 'تقنية GPS', level: 41 },
    { id: 4104, letter: 'ث', question: 'ثلاثة مخترعون أمريكيون اخترعوا الترانزستور؟', answer: 'ثلاثة علماء من مختبرات بيل', level: 41 },
    { id: 4105, letter: 'ج', question: 'جريمة إبادة جماعية راح ضحيتها مليون شخص في رواندا؟', answer: 'جريمة الإبادة الجماعية 1994', level: 41 },
    { id: 4106, letter: 'ح', question: 'حبل يربط قارتي أوروبا وآسيا أسفل مضيق البوسفور؟', answer: 'حبل/نفق البوسفور (أوراسيا)', level: 41 },
    { id: 4107, letter: 'خ', question: 'خوارزم: مدينة عالم مسلم أسّس علم الخوارزميات؟', answer: 'خوارزمي (محمد بن موسى)', level: 41 },
    { id: 4108, letter: 'د', question: 'دراسة فرع من علم الحيوان يختص بالحشرات؟', answer: 'دراسة الحشرات (الانتومولوجيا)', level: 41 },
    { id: 4109, letter: 'ذ', question: 'ذهب الأبيض: لقب الألماس في غرب أفريقيا لأيّ معدن؟', answer: 'ذهب الكولتان (كولومبايت - التنتاليت)', level: 41 },
    { id: 4110, letter: 'ر', question: 'ربط قارتا أمريكا الجنوبية ومعالم بذلك مضيق؟', answer: 'رابط مضيق دريك (Drake)', level: 41 },
    { id: 4111, letter: 'ز', question: 'زئبق: عنصر سائل عند درجة حرارة الغرفة ورمزه Hg؟', answer: 'زئبق (Mercury)', level: 41 },
    { id: 4112, letter: 'س', question: 'سيناريو انهيار ثقب أسود يُسمى؟', answer: 'سيناريو التفردية الكاملة', level: 41 },
    { id: 4113, letter: 'ش', question: 'شريط المحيط الهادئ الناري تُحيط به كثير من البراكين؟', answer: 'شريط النار الهادئ', level: 41 },
    { id: 4114, letter: 'ص', question: 'صراع الحضارات: نظرية صاغها هنتنغتون في كتاب؟', answer: 'صراع الحضارات (1996)', level: 41 },
    { id: 4115, letter: 'ض', question: 'ضربة في الملاكمة تُنهي المباراة بضربة واحدة؟', answer: 'ضربة قاضية (KO)', level: 41 },
    { id: 4116, letter: 'ط', question: 'طريق الحرير: مسار تجاري بين الصين وأوروبا عبر؟', answer: 'طريق الحرير الصيني', level: 41 },
    { id: 4117, letter: 'ظ', question: 'ظهور أول كمبيوتر شخصي في أي عقد؟', answer: 'ظهر في السبعينيات (1975)', level: 41 },
    { id: 4118, letter: 'ع', question: 'عقد الثمانينيات: الحرب الباردة بين قطبين؟', answer: 'عقد الحرب الباردة (أمريكا-روسيا)', level: 41 },
    { id: 4119, letter: 'غ', question: 'غزو نابليون لروسيا انتهى بكارثة في مدينة؟', answer: 'غزو موسكو الكارثي', level: 41 },
    { id: 4120, letter: 'ف', question: 'فيتنام: الحرب التي هُزمت فيها أمريكا وانتهت عام؟', answer: 'فيتنام 1975', level: 41 },
    { id: 4121, letter: 'ق', question: 'قرطبة في الأندلس كانت عاصمة لأي خلافة؟', answer: 'قرطبة (خلافة الأمويين)', level: 41 },
    { id: 4122, letter: 'ك', question: 'كيلومتر تضمّ المسافة من بكين لبرلين عبر الجو؟', answer: 'كيلومتر 7,700 تقريباً', level: 41 },
    { id: 4123, letter: 'ل', question: 'لييبنتز ونيوتن: اختلفا على اختراع أي علم رياضي؟', answer: 'لييبنتز/نيوتن (التفاضل والتكامل)', level: 41 },
    { id: 4124, letter: 'م', question: 'مخطوطة الفويينيش: أقدم مخطوطة لغزية في مدينة؟', answer: 'مخطوطة الفويينيش في خزانة يال', level: 41 },
    { id: 4125, letter: 'ن', question: 'نظام نقدي مهيمن قبل اليورو في فرنسا؟', answer: 'نظام الفرنك الفرنسي', level: 41 },
    { id: 4126, letter: 'هـ', question: 'هيروشيما: المدينة التي أُسقطت فيها القنبلة الذرية عام؟', answer: 'هيروشيما 1945', level: 41 },
    { id: 4127, letter: 'و', question: 'واترلو: معركة هُزم فيها نابليون نهائياً عام؟', answer: 'واترلو 1815', level: 41 },
    { id: 4128, letter: 'ي', question: 'يالطا: مؤتمر 1945 قسّم فيه الحلفاء ماذا؟', answer: 'يالطا (تقسيم أوروبا بعد الحرب)', level: 41 },

    // ══════════════════════════════════════════════════════════
    // 🔴 WORLD 4 - Levels 61-80 - عالم الأبطال (Very Hard)
    // ══════════════════════════════════════════════════════════

    // Level 61 - علوم متقدمة
    { id: 6101, letter: 'أ', question: 'أصغر وحدة في المادة لا تتجزأ وفق النظرية القديمة؟', answer: 'أتوم (الذرة)', level: 61 },
    { id: 6102, letter: 'ب', question: 'بروتون وغيره: ما الجسيمات الثلاثة المكونة للذرة؟', answer: 'بروتون، نيوترون، إلكترون', level: 61 },
    { id: 6103, letter: 'ت', question: 'تفاعل نووي: توحّد نوى خفيفة لإنتاج طاقة هائلة؟', answer: 'تفاعل الاندماج النووي', level: 61 },
    { id: 6104, letter: 'ث', question: 'ثنائي الحمض النووي ما هو الاسم الكامل له؟', answer: 'ثنائي الحمض النووي الريبوزي (DNA)', level: 61 },
    { id: 6105, letter: 'ج', question: 'جسيم أعطى الكتلة لكل الجسيمات الأخرى؟', answer: 'جسيم هيغز (بوزون هيغز)', level: 61 },
    { id: 6106, letter: 'ح', question: 'حساب ناسا يُظهر أن الكون عمره؟', answer: 'حوالي 13.8 مليار سنة', level: 61 },
    { id: 6107, letter: 'خ', question: 'خوارزمية تُستخدم في البحث في قواعد البيانات؟', answer: 'خوارزمية البحث الثنائي (Binary Search)', level: 61 },
    { id: 6108, letter: 'د', question: 'دالة تصف حالة الكم لجسيم دون ذري؟', answer: 'دالة الموجة (Wave Function)', level: 61 },
    { id: 6109, letter: 'ذ', question: 'ذروة الإنتاج النفطي في نظرية توقعها هوبرت؟', answer: 'ذروة هوبرت (Peak Oil)', level: 61 },
    { id: 6110, letter: 'ر', question: 'ربط النسبية بالجاذبية: معادلة أينشتاين الشهيرة؟', answer: 'ربط E=mc² (الطاقة والكتلة)', level: 61 },
    { id: 6111, letter: 'ز', question: 'زمن بلانك: أقصر وحدة زمنية ممكنة فيزيائياً؟', answer: 'زمن بلانك (10^-43 ثانية)', level: 61 },
    { id: 6112, letter: 'س', question: 'سوبرنوفا: انفجار نجم عملاق في نهاية دورته؟', answer: 'سوبرنوفا (المستعر الأعظم)', level: 61 },
    { id: 6113, letter: 'ش', question: 'شرودنغر: معادلة تصف معادلات ميكانيكا الكم؟', answer: 'شرودنغر (معادلة الكم)', level: 61 },
    { id: 6114, letter: 'ص', question: 'صيغة ماكسويل الرياضية تصف ماذا في الفيزياء؟', answer: 'صيغة الموجات الكهرومغناطيسية', level: 61 },
    { id: 6115, letter: 'ض', question: 'ضدّ المادة يُنتج انفجاراً حين يلتقي بالمادة؟', answer: 'ضد المادة (Antimatter)', level: 61 },
    { id: 6116, letter: 'ط', question: 'طاقة مظلمة: تُشكّل كم بالمئة من الكون؟', answer: 'طاقة مظلمة 68%', level: 61 },
    { id: 6117, letter: 'ظ', question: 'ظهور نجوم النيوترون بعد انفجار سوبرنوفا يُنتج كذلك؟', answer: 'ظهور ثقب أسود أحياناً', level: 61 },
    { id: 6118, letter: 'ع', question: 'علم يدرس التسارع في الجسيمات يُسمى؟', answer: 'علم فيزياء الجسيمات', level: 61 },
    { id: 6119, letter: 'غ', question: 'غيوم ماجلان: مجرات صغيرة قريبة من درب التبانة؟', answer: 'غيوم ماجلانية (Large & Small)', level: 61 },
    { id: 6120, letter: 'ف', question: 'فوتون: جسيم ضوء لا كتلة له ولا يتباطأ في؟', answer: 'فوتون الضوء (في الفراغ)', level: 61 },
    { id: 6121, letter: 'ق', question: 'قوة نووية قوية تربط الكواركات داخل النواة؟', answer: 'قوة النووية القوية (Strong Force)', level: 61 },
    { id: 6122, letter: 'ك', question: 'كواركات الأعلى، الأسفل، الغريب، المفسون؟', answer: 'كواركات (جسيمات دون ذرية)', level: 61 },
    { id: 6123, letter: 'ل', question: 'لايبنتز: نظام عددي ثنائي 0 و1 أساس الحاسوب؟', answer: 'لايبنتز (النظام الثنائي)', level: 61 },
    { id: 6124, letter: 'م', question: 'مسرع الجسيمات LHC يقع في مدينة سويسرية؟', answer: 'مدينة جنيف (CERN)', level: 61 },
    { id: 6125, letter: 'ن', question: 'نظرية الأوتار تقترح أن الكون له كم بُعداً؟', answer: 'نظرية 11 بُعداً', level: 61 },
    { id: 6126, letter: 'هـ', question: 'هيغز: جسيم اكتُشف في LHC عام؟', answer: 'هيغز 2012', level: 61 },
    { id: 6127, letter: 'و', question: 'وحدة الكتلة الذرية الموحدة تُسمى؟', answer: 'وحدة الدالتون (Dalton)', level: 61 },
    { id: 6128, letter: 'ي', question: 'يوكاوا: فيزيائي ياباني اكتشف الجسيم الوسيط بين الكواركات؟', answer: 'يوكاوا (البيون - Pion)', level: 61 },

    // ══════════════════════════════════════════════════════════
    // 🟣 WORLD 5 - Levels 81-100 - عالم الأساطير (Expert)
    // ══════════════════════════════════════════════════════════

    // Level 81 - خبراء فقط
    { id: 8101, letter: 'أ', question: 'أقدم نص ديني مكتوب في التاريخ البشري؟', answer: 'أقدم نص سومري (ريجفيدا/بيرامدس)', level: 81 },
    { id: 8102, letter: 'ب', question: 'بيلانيكوف: رياضي البيانات يُعرِّف الإحصاء الاستدلالي بماذا؟', answer: 'بياناتنا تمثل عينة لمجتمع إحصائي', level: 81 },
    { id: 8103, letter: 'ت', question: 'توبولوجيا: هل الكأس والدونا متكافئتان طوبولوجياً؟', answer: 'توبولوجياً نعم (كلاهما بثقب واحد)', level: 81 },
    { id: 8104, letter: 'ث', question: 'ثلاثي الأبعاد: شكل رباعي الوجوه أقل عدد أوجه ممكن؟', answer: 'ثلاثي الأوجه (التتراييدر)', level: 81 },
    { id: 8105, letter: 'ج', question: 'جوديل: نظرية اللاكتمال تثبت ماذا في الرياضيات؟', answer: 'جوديل: وجود حقائق لا تُبرهن داخل النظام', level: 81 },
    { id: 8106, letter: 'ح', question: 'حدّ بلانك: أصغر مسافة مجدية فيزيائياً؟', answer: 'حدّ بلانك (10^-35 متر)', level: 81 },
    { id: 8107, letter: 'خ', question: 'خاصية الشمولية الكمومية: حالة عدم التعيّن اكتشفت في تجربة؟', answer: 'خاصية الشق المزدوج (Young)', level: 81 },
    { id: 8108, letter: 'د', question: 'دالة أويلر Z تُستخدم في اشتقاق الناتج داخل؟', answer: 'دالة زيتا ريمان (نظرية الأعداد)', level: 81 },
    { id: 8109, letter: 'ذ', question: 'ذاكرة الكوانتوم: أي مبدأ يمنع تشفير المعلومة مرتين؟', answer: 'ذاكرة محدودة بمبدأ لا-الاستنساخ الكمومي', level: 81 },
    { id: 8110, letter: 'ر', question: 'رياضيات غير أوقليدية: من اكتشف الهندسة الهاربولية؟', answer: 'ريمان ولوباتشيفسكي', level: 81 },
    { id: 8111, letter: 'ز', question: 'زمن الانعكاس: أي المعادلات الفيزيائية لا تتبدل بعكسه؟', answer: 'زمن انتروبيا الثرموديناميك (تبقى أحادية)', level: 81 },
    { id: 8112, letter: 'س', question: 'سيفرت: مجموعة التحويلات التي تحافظ على بنية رياضية؟', answer: 'سيفرت (مجموعة التماثل)', level: 81 },
    { id: 8113, letter: 'ش', question: 'شوارزشيلد: حساب نصف قطر الثقب الأسود يعتمد على؟', answer: 'شوارزشيلد راديوس (2GM/c²)', level: 81 },
    { id: 8114, letter: 'ص', question: 'صياغة لاغرانج للميكانيكا تختلف عن نيوتن لأنها تعتمد؟', answer: 'صياغة بالطاقة الحركية والإمكانية', level: 81 },
    { id: 8115, letter: 'ض', question: 'ضفيرة: في الطوبولوجيا ما المجموعة التي تصفها؟', answer: 'ضفيرة مجموعة برود (Braid Group)', level: 81 },
    { id: 8116, letter: 'ط', question: 'طيف انبعاثي أول نموذج له وضعه بور لذرة؟', answer: 'طيف الهيدروجين (نموذج بور)', level: 81 },
    { id: 8117, letter: 'ظ', question: 'ظاهرة التشابك الكمومي وصفها أينشتاين بـ؟', answer: 'ظاهرة "الفعل المخيف عن بُعد"', level: 81 },
    { id: 8118, letter: 'ع', question: 'علم التشفير المعتمد على الأعداد الأولية يُسمى؟', answer: 'علم تشفير RSA', level: 81 },
    { id: 8119, letter: 'غ', question: 'غير مكتمل: ما الافتراض الذي لم يُثبت بعد في رياضيات؟', answer: 'غير مثبتة فرضية ريمان', level: 81 },
    { id: 8120, letter: 'ف', question: 'فضاء هيلبرت: في ميكانيكا الكم يمثل ماذا؟', answer: 'فضاء الحالات الكمومية', level: 81 },
    { id: 8121, letter: 'ق', question: 'قياس إنتروبيا نظام العالم كله يزداد وفق؟', answer: 'قانون الثرموديناميك الثاني', level: 81 },
    { id: 8122, letter: 'ك', question: 'كولموغوروف: قاعدة تحديد تعقيد خوارزمية؟', answer: 'كولموغوروف: التعقيد الوصفي', level: 81 },
    { id: 8123, letter: 'ل', question: 'لانوين: المعادلة الديناميكية الجزيئية تصف حركة؟', answer: 'لانجيفن: حركة جزيئات براونية', level: 81 },
    { id: 8124, letter: 'م', question: 'مبدأ هايزنبرغ: لماذا لا نعرف الموضع والزخم معاً؟', answer: 'مبدأ الشك (عدم اليقين)', level: 81 },
    { id: 8125, letter: 'ن', question: 'نظرية الفئات في الرياضيات من أسسها؟', answer: 'نظرية ماكلين وإيلنبرغ', level: 81 },
    { id: 8126, letter: 'هـ', question: 'هاميلتوني: صياغة فيزيائية تعتمد على الطاقة الكلية؟', answer: 'هاميلتوني (مدرسة هاملتون)', level: 81 },
    { id: 8127, letter: 'و', question: 'وظيفة موجة شرودنغر لجسيم حر في فراغ: الحل الأساسي؟', answer: 'وظيفة موجية سطح التذبذب', level: 81 },
    { id: 8128, letter: 'ي', question: 'يانغ-ميلز: نظرية الحقل الموحد، تبحث في؟', answer: 'يانغ-ميلز (القوى الأساسية الثلاث)', level: 81 },
];

/** Helper: get questions for a specific letter and level */
export function getQuestionsForLevel(letter: string, level: number): LetterQuestion[] {
    // Find world based on level
    const world = level <= 20 ? 1 : level <= 40 ? 2 : level <= 60 ? 3 : level <= 80 ? 4 : 5;
    const worldStart = [1, 21, 41, 61, 81][world - 1];
    const worldEnd = [20, 40, 60, 80, 100][world - 1];

    // Try to get level-specific questions first
    const exactMatch = LETTER_GAME_QUESTIONS.filter(q => q.letter === letter && q.level === level);
    if (exactMatch.length > 0) return exactMatch;

    // Fallback: world-range questions
    const worldMatch = LETTER_GAME_QUESTIONS.filter(q => q.letter === letter && q.level !== undefined && q.level >= worldStart && q.level <= worldEnd);
    if (worldMatch.length > 0) return worldMatch;

    // Final fallback: any question for this letter
    return LETTER_GAME_QUESTIONS.filter(q => q.letter === letter);
}

/** Level theme config */
export const LEVEL_WORLDS = [
    { id: 1, name: 'عالم المبتدئين', levels: [1, 20], color: '#22c55e', darkColor: '#15803d', emoji: '🟢', bg: 'from-green-900 to-green-950', badge: 'text-green-400 border-green-500 bg-green-500/10' },
    { id: 2, name: 'عالم المتمرن', levels: [21, 40], color: '#3b82f6', darkColor: '#1d4ed8', emoji: '🔵', bg: 'from-blue-900 to-blue-950', badge: 'text-blue-400 border-blue-500 bg-blue-500/10' },
    { id: 3, name: 'عالم المحترف', levels: [41, 60], color: '#f97316', darkColor: '#c2410c', emoji: '🟠', bg: 'from-orange-900 to-orange-950', badge: 'text-orange-400 border-orange-500 bg-orange-500/10' },
    { id: 4, name: 'عالم الأبطال', levels: [61, 80], color: '#ef4444', darkColor: '#b91c1c', emoji: '🔴', bg: 'from-red-900 to-red-950', badge: 'text-red-400 border-red-500 bg-red-500/10' },
    { id: 5, name: 'عالم الأساطير', levels: [81, 100], color: '#a855f7', darkColor: '#7e22ce', emoji: '🟣', bg: 'from-purple-900 to-purple-950', badge: 'text-purple-400 border-purple-500 bg-purple-500/10' },
] as const;

export function getWorldForLevel(level: number) {
    return LEVEL_WORLDS.find(w => level >= w.levels[0] && level <= w.levels[1]) ?? LEVEL_WORLDS[0];
}
