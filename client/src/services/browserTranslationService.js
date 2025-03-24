/**
 * Advanced Browser Translation Service
 * 
 * A comprehensive client-side translation system for the LML Mailer app.
 * This implementation uses full sentence translation and template-based substitution
 * to provide high-quality translations without external API dependencies.
 */

// In-memory cache for translations to reduce computational load
const translationCache = new Map();

/**
 * Calculate a hash for caching based on text content
 */
const hashText = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * Get cached translation if available
 */
export const getCachedTranslation = (text, sourceLang, targetLang) => {
  const key = `${sourceLang}_${targetLang}_${hashText(text)}`;
  return translationCache.get(key);
};

/**
 * Store translation in cache
 */
export const setCachedTranslation = (text, sourceLang, targetLang, translatedText) => {
  const key = `${sourceLang}_${targetLang}_${hashText(text)}`;
  translationCache.set(key, translatedText);
  console.log(`Translation cache size: ${translationCache.size} entries`);
};

/**
 * Full sentence/paragraph translations for common templates
 */
const sentenceTranslations = {
  'ja': { // Japanese
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'メルボルンの活気あるライブ音楽シーンは、アットホームなジャズクラブからスタジアムでのロックコンサートまで、さまざまな音楽体験を提供しています。',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': '460以上のライブ音楽会場があり、世界有数の音楽都市の一つです。',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'メルボルンは歴史的なパブから現代的なパフォーマンススペースまで様々な会場があり、活気あるライブ音楽文化を持っています。',
    'The city hosts more live music venues per capita than any other city in the world.': 'この都市は世界のどの都市よりも人口あたりのライブ音楽会場が多いです。',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'オーストラリアの音楽の首都として知られるメルボルンのライブシーンは、インディーロックやエレクトロニックからジャズやクラシックまで多岐にわたるジャンルを網羅しています。',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': '市内の多様な会場は、音楽愛好家にとってユニークな文化的なタペストリーを作り出しています。',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'メルボルンの象徴的な音楽シーンは数え切れないほどのキャリアを生み出し、一年中世界中のアーティストを魅了しています。',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'ユニークな地区に点在する会場は、それぞれ独自の音楽的な味わいと雰囲気を提供しています。',
    'MELBOURNE GIG GUIDE': 'メルボルンライブガイド',
    'GIGS NEAR YOU': 'あなたの近くのライブ',
    'HOW TO USE': '使い方',
    'View on mobile to scan QR codes directly from screen': 'QRコードを直接画面からスキャンするにはモバイルで表示してください',
    'QR codes link to venue locations on Google Maps': 'QRコードはGoogle Map上の会場の場所にリンクしています',
    'Share this guide with friends!': 'このガイドを友達と共有しましょう！',
    'This information was sent to': 'この情報は次の宛先に送信されました',
    'Melbourne Gig Guide - Supporting local music and venues.': 'メルボルンライブガイド - 地元の音楽と会場をサポートしています。',
    'km away': 'km 離れた場所',
    'Check venue': '会場を確認',
    'Free': '無料',
    'TBA': '未定'
  },
  'zh-CN': { // Simplified Chinese
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': '墨尔本充满活力的现场音乐场景提供了从私密爵士俱乐部到体育场摇滚音乐会的一切。',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': '拥有超过460个现场音乐场地，它是世界领先的音乐城市之一。',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': '墨尔本拥有蓬勃发展的现场音乐文化，场地范围从历史悠久的酒吧到现代表演空间。',
    'The city hosts more live music venues per capita than any other city in the world.': '这座城市拥有的人均现场音乐场地数量超过世界上任何其他城市。',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': '作为澳大利亚的音乐之都，墨尔本的现场表演跨越了从独立摇滚和电子到爵士和古典的各种音乐流派。',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': '这座城市多样化的场地为音乐爱好者创造了独特的文化画卷。',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': '墨尔本标志性的音乐场景培养了无数的音乐职业，全年吸引着全球的表演。',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': '场地分布在独特的社区中，每个场地都提供其自身的音乐风味和氛围。',
    'MELBOURNE GIG GUIDE': '墨尔本演出指南',
    'GIGS NEAR YOU': '您附近的演出',
    'HOW TO USE': '使用方法',
    'View on mobile to scan QR codes directly from screen': '在移动设备上查看以直接从屏幕扫描二维码',
    'QR codes link to venue locations on Google Maps': '二维码链接到Google地图上的场地位置',
    'Share this guide with friends!': '与朋友分享此指南！',
    'This information was sent to': '此信息已发送至',
    'Melbourne Gig Guide - Supporting local music and venues.': '墨尔本演出指南 - 支持本地音乐和场地。',
    'km away': '公里外',
    'Check venue': '查看场地',
    'Free': '免费',
    'TBA': '待定'
  },
  'zh-TW': { // Traditional Chinese 
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': '墨爾本充滿活力的現場音樂場景提供了從私密爵士俱樂部到體育場搖滾音樂會的一切。',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': '擁有超過460個現場音樂場地，它是世界領先的音樂城市之一。',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': '墨爾本擁有蓬勃發展的現場音樂文化，場地範圍從歷史悠久的酒吧到現代表演空間。',
    'The city hosts more live music venues per capita than any other city in the world.': '這座城市擁有的人均現場音樂場地數量超過世界上任何其他城市。',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': '作為澳大利亞的音樂之都，墨爾本的現場表演跨越了從獨立搖滾和電子到爵士和古典的各種音樂流派。',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': '這座城市多樣化的場地為音樂愛好者創造了獨特的文化畫卷。',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': '墨爾本標誌性的音樂場景培養了無數的音樂職業，全年吸引著全球的表演。',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': '場地分佈在獨特的社區中，每個場地都提供其自身的音樂風味和氛圍。',
    'MELBOURNE GIG GUIDE': '墨爾本表演指南',
    'GIGS NEAR YOU': '您附近的表演',
    'HOW TO USE': '使用方法',
    'View on mobile to scan QR codes directly from screen': '在移動設備上查看以直接從屏幕掃描二維碼',
    'QR codes link to venue locations on Google Maps': '二維碼鏈接到Google地圖上的場地位置',
    'Share this guide with friends!': '與朋友分享此指南！',
    'This information was sent to': '此信息已發送至',
    'Melbourne Gig Guide - Supporting local music and venues.': '墨爾本表演指南 - 支持本地音樂和場地。',
    'km away': '公里外',
    'Check venue': '查看場地',
    'Free': '免費',
    'TBA': '待定'
  },
  'ar': { // Arabic - comprehensive full phrases
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'تقدم ساحة الموسيقى الحية النابضة بالحياة في ملبورن كل شيء من نوادي الجاز الحميمة إلى حفلات الروك في الملاعب.',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': 'مع أكثر من 460 مكانًا للموسيقى الحية، تعد واحدة من المدن الموسيقية الرائدة في العالم.',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'تتمتع ملبورن بثقافة موسيقية حية مزدهرة، مع أماكن تتراوح من الحانات التاريخية إلى مساحات الأداء الحديثة.',
    'The city hosts more live music venues per capita than any other city in the world.': 'تستضيف المدينة أماكن موسيقية حية أكثر من أي مدينة أخرى في العالم نسبة لعدد السكان.',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'المعروفة بعاصمة الموسيقى في أستراليا، تمتد ساحة ملبورن الحية عبر أنواع موسيقية من روك الإندي والإلكترونية إلى الجاز والكلاسيكية.',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': 'تخلق أماكن المدينة المتنوعة نسيجًا ثقافيًا فريدًا لعشاق الموسيقى.',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'أطلقت ساحة الموسيقى الأيقونية في ملبورن مهنًا لا تحصى وتجذب العروض العالمية على مدار العام.',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'مع أماكن متناثرة عبر أحياء فريدة، كل منها يقدم طابعًا موسيقيًا خاصًا به وأجواءً مميزة.',
    'MELBOURNE GIG GUIDE': 'دليل العروض الموسيقية في ملبورن',
    'GIGS NEAR YOU': 'عروض موسيقية بالقرب منك',
    'HOW TO USE': 'كيفية الاستخدام',
    'View on mobile to scan QR codes directly from screen': 'اعرض على الهاتف المحمول لمسح رموز QR مباشرة من الشاشة',
    'QR codes link to venue locations on Google Maps': 'رموز QR تربط بمواقع الأماكن على خرائط جوجل',
    'Share this guide with friends!': 'شارك هذا الدليل مع الأصدقاء!',
    'This information was sent to': 'تم إرسال هذه المعلومات إلى',
    'Melbourne Gig Guide - Supporting local music and venues.': 'دليل العروض الموسيقية في ملبورن - دعم الموسيقى المحلية وقاعات الحفلات.',
    'km away': 'كم بعيدا',
    'Check venue': 'تحقق من قاعة الحفلات',
    'Free': 'مجاني',
    'TBA': 'سيتم الإعلان لاحقًا'
  },
  'vi': { // Vietnamese
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'Khung cảnh âm nhạc sống sôi động của Melbourne cung cấp mọi thứ từ câu lạc bộ jazz thân mật đến các buổi hòa nhạc rock sân vận động.',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': 'Với hơn 460 địa điểm âm nhạc sống, đây là một trong những thành phố âm nhạc hàng đầu thế giới.',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'Melbourne có nền văn hóa âm nhạc sống phát triển mạnh mẽ, với các địa điểm từ quán rượu lịch sử đến không gian biểu diễn hiện đại.',
    'The city hosts more live music venues per capita than any other city in the world.': 'Thành phố này có nhiều địa điểm âm nhạc sống bình quân đầu người hơn bất kỳ thành phố nào khác trên thế giới.',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'Được biết đến là thủ đô âm nhạc của Úc, khung cảnh âm nhạc sống của Melbourne trải dài từ rock độc lập và điện tử đến jazz và cổ điển.',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': 'Các địa điểm đa dạng của thành phố tạo nên một bức tranh văn hóa độc đáo cho những người yêu âm nhạc.',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'Khung cảnh âm nhạc biểu tượng của Melbourne đã khởi động vô số sự nghiệp và thu hút các buổi biểu diễn toàn cầu quanh năm.',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'Với các địa điểm rải rác khắp các khu phố độc đáo, mỗi nơi đều mang lại hương vị âm nhạc và bầu không khí riêng.',
    'MELBOURNE GIG GUIDE': 'HƯỚNG DẪN BUỔI DIỄN MELBOURNE',
    'GIGS NEAR YOU': 'BUỔI DIỄN GẦN BẠN',
    'HOW TO USE': 'CÁCH SỬ DỤNG',
    'View on mobile to scan QR codes directly from screen': 'Xem trên điện thoại di động để quét mã QR trực tiếp từ màn hình',
    'QR codes link to venue locations on Google Maps': 'Mã QR liên kết đến vị trí địa điểm trên Google Maps',
    'Share this guide with friends!': 'Chia sẻ hướng dẫn này với bạn bè!',
    'This information was sent to': 'Thông tin này đã được gửi đến',
    'Melbourne Gig Guide - Supporting local music and venues.': 'Hướng Dẫn Buổi Diễn Melbourne - Hỗ trợ âm nhạc và địa điểm địa phương.',
    'km away': 'km cách xa',
    'Check venue': 'Kiểm tra địa điểm',
    'Free': 'Miễn phí',
    'TBA': 'Sẽ được thông báo'
  },
  'es': { // Spanish
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'La vibrante escena musical en vivo de Melbourne ofrece de todo, desde íntimos clubes de jazz hasta conciertos de rock en estadios.',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': 'Con más de 460 locales de música en vivo, es una de las principales ciudades musicales del mundo.',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'Melbourne tiene una próspera cultura musical en vivo, con locales que van desde pubs históricos hasta espacios de actuación modernos.',
    'The city hosts more live music venues per capita than any other city in the world.': 'La ciudad alberga más locales de música en vivo per cápita que cualquier otra ciudad del mundo.',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'Conocida como la capital musical de Australia, la escena en vivo de Melbourne abarca géneros desde rock indie y electrónica hasta jazz y música clásica.',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': 'Los diversos locales de la ciudad crean un tapiz cultural único para los amantes de la música.',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'La icónica escena musical de Melbourne ha lanzado innumerables carreras y atrae a actos globales durante todo el año.',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'Con locales dispersos por barrios únicos, cada uno ofreciendo su propio sabor musical y atmósfera.',
    'MELBOURNE GIG GUIDE': 'GUÍA DE CONCIERTOS DE MELBOURNE',
    'GIGS NEAR YOU': 'CONCIERTOS CERCA DE TI',
    'HOW TO USE': 'CÓMO USAR',
    'View on mobile to scan QR codes directly from screen': 'Ver en el móvil para escanear códigos QR directamente desde la pantalla',
    'QR codes link to venue locations on Google Maps': 'Los códigos QR enlazan a las ubicaciones de los locales en Google Maps',
    'Share this guide with friends!': '¡Comparte esta guía con amigos!',
    'This information was sent to': 'Esta información fue enviada a',
    'Melbourne Gig Guide - Supporting local music and venues.': 'Guía de Conciertos de Melbourne - Apoyando la música local y los locales.',
    'km away': 'km de distancia',
    'Check venue': 'Consultar local',
    'Free': 'Gratis',
    'TBA': 'Por anunciar'
  },
  'de': { // German
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'Melbournes lebendige Live-Musikszene bietet alles von intimen Jazzclubs bis hin zu Stadion-Rockkonzerten.',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': 'Mit über 460 Live-Musikveranstaltungsorten ist es eine der führenden Musikstädte der Welt.',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'Melbourne hat eine blühende Live-Musikkultur mit Veranstaltungsorten, die von historischen Pubs bis hin zu modernen Aufführungsräumen reichen.',
    'The city hosts more live music venues per capita than any other city in the world.': 'Die Stadt beherbergt mehr Live-Musikveranstaltungsorte pro Kopf als jede andere Stadt der Welt.',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'Melbourne, bekannt als Australiens Musikhauptstadt, umfasst in seiner Live-Szene Genres von Indie-Rock und Elektronik bis hin zu Jazz und Klassik.',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': 'Die vielfältigen Veranstaltungsorte der Stadt schaffen ein einzigartiges kulturelles Geflecht für Musikliebhaber.',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'Melbournes ikonische Musikszene hat unzählige Karrieren gestartet und zieht das ganze Jahr über weltweite Acts an.',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'Mit Veranstaltungsorten, die über einzigartige Viertel verstreut sind, bietet jeder seinen eigenen musikalischen Geschmack und Atmosphäre.',
    'MELBOURNE GIG GUIDE': 'MELBOURNE KONZERTFÜHRER',
    'GIGS NEAR YOU': 'KONZERTE IN DEINER NÄHE',
    'HOW TO USE': 'ANLEITUNG',
    'View on mobile to scan QR codes directly from screen': 'Auf dem Mobilgerät ansehen, um QR-Codes direkt vom Bildschirm zu scannen',
    'QR codes link to venue locations on Google Maps': 'QR-Codes verlinken zu Veranstaltungsorten auf Google Maps',
    'Share this guide with friends!': 'Teile diesen Führer mit Freunden!',
    'This information was sent to': 'Diese Information wurde gesendet an',
    'Melbourne Gig Guide - Supporting local music and venues.': 'Melbourne Konzertführer - Unterstützung lokaler Musik und Veranstaltungsorte.',
    'km away': 'km entfernt',
    'Check venue': 'Veranstaltungsort prüfen',
    'Free': 'Kostenlos',
    'TBA': 'Wird bekannt gegeben'
  },
  'hi': { // Hindi
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': 'मेलबर्न का जीवंत लाइव संगीत दृश्य आत्मीय जैज़ क्लबों से लेकर स्टेडियम रॉक कॉन्सर्ट तक सब कुछ प्रदान करता है।',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': '460 से अधिक लाइव संगीत स्थलों के साथ, यह दुनिया के अग्रणी संगीत शहरों में से एक है।',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': 'मेलबर्न में एक समृद्ध लाइव संगीत संस्कृति है, जिसमें ऐतिहासिक पब से लेकर आधुनिक प्रदर्शन स्थलों तक के स्थान शामिल हैं।',
    'The city hosts more live music venues per capita than any other city in the world.': 'यह शहर दुनिया के किसी भी अन्य शहर की तुलना में प्रति व्यक्ति अधिक लाइव संगीत स्थलों की मेजबानी करता है।',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': 'ऑस्ट्रेलिया की संगीत राजधानी के रूप में जाना जाता है, मेलबर्न का लाइव दृश्य इंडी रॉक और इलेक्ट्रॉनिक से लेकर जैज़ और शास्त्रीय तक के शैलियों में फैला हुआ है।',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': 'शहर के विविध स्थल संगीत प्रेमियों के लिए एक अनोखा सांस्कृतिक ताना-बाना बनाते हैं।',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': 'मेलबर्न के प्रतिष्ठित संगीत दृश्य ने अनगिनत करियर लॉन्च किए हैं और साल भर वैश्विक कार्यक्रमों को आकर्षित करता है।',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': 'अनोखे पड़ोसों में बिखरे हुए स्थलों के साथ, प्रत्येक अपना संगीतमय स्वाद और वातावरण प्रदान करता है।',
    'MELBOURNE GIG GUIDE': 'मेलबर्न संगीत कार्यक्रम गाइड',
    'GIGS NEAR YOU': 'आपके पास संगीत कार्यक्रम',
    'HOW TO USE': 'उपयोग कैसे करें',
    'View on mobile to scan QR codes directly from screen': 'स्क्रीन से सीधे QR कोड स्कैन करने के लिए मोबाइल पर देखें',
    'QR codes link to venue locations on Google Maps': 'QR कोड Google Maps पर स्थल स्थानों से जुड़ते हैं',
    'Share this guide with friends!': 'इस गाइड को दोस्तों के साथ साझा करें!',
    'This information was sent to': 'यह जानकारी भेजी गई',
    'Melbourne Gig Guide - Supporting local music and venues.': 'मेलबर्न संगीत कार्यक्रम गाइड - स्थानीय संगीत और स्थलों का समर्थन।',
    'km away': 'किमी दूर',
    'Check venue': 'स्थान जांचें',
    'Free': 'मुफ्त',
    'TBA': 'घोषित किया जाएगा'
  },
  'ko': { // Korean
    'Melbourne\'s vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts.': '멜버른의 활기찬 라이브 음악 현장은 아늑한 재즈 클럽부터 스타디움 록 콘서트까지 다양한 경험을 제공합니다.',
    'With over 460 live music venues, it\'s one of the world\'s leading music cities.': '460개가 넘는 라이브 음악 공연장을 보유하고 있어 세계 최고의 음악 도시 중 하나입니다.',
    'Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces.': '멜버른은 역사적인 펍부터 현대적인 공연장까지 다양한 장소에서 번성하는 라이브 음악 문화를 가지고 있습니다.',
    'The city hosts more live music venues per capita than any other city in the world.': '이 도시는 전 세계 어느 도시보다 1인당 더 많은 라이브 음악 공연장을 보유하고 있습니다.',
    'Known as Australia\'s music capital, Melbourne\'s live scene spans genres from indie rock and electronic to jazz and classical.': '호주의 음악 수도로 알려진 멜버른의 라이브 현장은 인디 록과 전자음악부터 재즈와 클래식까지 다양한 장르를 아우릅니다.',
    'The city\'s diverse venues create a unique cultural tapestry for music lovers.': '도시의 다양한 공연장은 음악 애호가들을 위한 독특한 문화적 모자이크를 창출합니다.',
    'Melbourne\'s iconic music scene has launched countless careers and attracts global acts year-round.': '멜버른의 상징적인 음악 현장은 수많은 커리어를 시작시켰으며 연중 글로벌 아티스트들을 끌어들입니다.',
    'With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere.': '독특한 지역 전체에 산재해 있는 공연장들은 각각 자신만의 음악적 풍미와 분위기를 제공합니다.',
    'MELBOURNE GIG GUIDE': '멜버른 공연 가이드',
    'GIGS NEAR YOU': '가까운 공연',
    'HOW TO USE': '사용 방법',
    'View on mobile to scan QR codes directly from screen': '화면에서 직접 QR 코드를 스캔하려면 모바일에서 보기',
    'QR codes link to venue locations on Google Maps': 'QR 코드는 Google 지도의 공연장 위치로 연결됩니다',
    'Share this guide with friends!': '이 가이드를 친구들과 공유하세요!',
    'This information was sent to': '이 정보가 전송됨',
    'Melbourne Gig Guide - Supporting local music and venues.': '멜버른 공연 가이드 - 지역 음악과 공연장 지원.',
    'km away': 'km 떨어짐',
    'Check venue': '공연장 확인',
    'Free': '무료',
    'TBA': '추후 발표'
  }
};

/**
 * Dictionary for translating artist and venue names and titles
 * We don't translate these by default, but have some common translations
 */
const properNameTranslations = {
  'ar': {
    'Melbourne': 'ملبورن',
    'Fitzroy': 'فيتزروي',
    'Richmond': 'ريتشموند',
    'venue': 'قاعة الحفلات',
    'venues': 'قاعات الحفلات',
    'gig': 'عرض موسيقي',
    'gigs': 'عروض موسيقية',
    'concert': 'حفلة موسيقية',
    'concerts': 'حفلات موسيقية',
    'music': 'موسيقى',
    'musical': 'موسيقي',
    'guide': 'دليل',
    'near': 'بالقرب من',
    'you': 'منك',
    'check': 'تحقق من',
  },
  'zh-CN': {
    'Melbourne': '墨尔本',
    'Fitzroy': '菲茨罗伊',
    'Richmond': '里士满',
  },
  'zh-TW': {
    'Melbourne': '墨爾本',
    'Fitzroy': '菲茨羅伊',
    'Richmond': '里士滿',
  },
  'hi': {
    'Melbourne': 'मेलबर्न',
  },
  'ko': {
    'Melbourne': '멜버른',
  },
  'ja': {
    'Melbourne': 'メルボルン',
  }
};

/**
 * Full templates for each section
 */
const sectionTemplates = {
  'ja': {
    'header': '=== メルボルン ライブガイド - {date} ===',
    'description_paragraph': '{description}',
    'gigs_near_you_header': '--- あなたの近くのライブ ---',
    'gig_item': `▶ {num}. {name}
   🏢 {venue} | {distance}
   📍 {address}
   🕒 {time} | 💲 {price}
   {genres}
   🗺️ {mapUrl}
   QR: {qrUrl}
   ----------------------`,
    'how_to_use': `=== 使い方 ===
• モバイルで表示してQRコードを直接スキャン
• QRコードは会場の場所へのリンク
• このガイドを友達と共有しましょう！`,
    'footer': `---
この情報は{name}（{email}）に送信されました。
メルボルン ライブガイド - 地元の音楽と会場をサポート。`
  },
  'ar': {
    'header': '=== دليل حفلات ملبورن - {date} ===',
    'description_paragraph': '{description}',
    'gigs_near_you_header': '--- حفلات بالقرب منك ---',
    'gig_item': `▶ {num}. {name}
   🏢 {venue} | {distance}
   📍 {address}
   🕒 {time} | 💲 {price}
   {genres}
   🗺️ {mapUrl}
   رمز الاستجابة السريعة: {qrUrl}
   ----------------------`,
    'how_to_use': `=== كيفية الاستخدام ===
• عرض على الهاتف المحمول لمسح رموز الاستجابة السريعة مباشرة من الشاشة
• رموز الاستجابة السريعة تربط بمواقع الأماكن على خرائط جوجل
• شارك هذا الدليل مع الأصدقاء!`,
    'footer': `---
تم إرسال هذه المعلومات إلى {name} على {email}.
دليل حفلات ملبورن - دعم الموسيقى المحلية والأماكن.`
  }
};

/**
 * Translate a full paragraph using the sentence database
 * @param {string} paragraph - Paragraph to translate
 * @param {string} targetLang - Target language
 * @returns {string} - Translated paragraph
 */
const translateParagraph = (paragraph, targetLang) => {
  // Check if we have this exact paragraph in our database
  const langSentences = sentenceTranslations[targetLang] || {};
  if (langSentences[paragraph]) {
    return langSentences[paragraph];
  }
  
  // Look for sentences we know how to translate
  let translatedParagraph = paragraph;
  const possibleSentences = Object.keys(langSentences).sort((a, b) => b.length - a.length);
  
  for (const sentence of possibleSentences) {
    if (paragraph.includes(sentence)) {
      translatedParagraph = translatedParagraph.replace(
        sentence, 
        langSentences[sentence]
      );
    }
  }
  
  // Translate any proper names if needed
  const nameTranslations = properNameTranslations[targetLang] || {};
  Object.keys(nameTranslations).forEach(name => {
    // Only replace full words, not parts of words
    const nameRegex = new RegExp(`\\b${name}\\b`, 'g');
    translatedParagraph = translatedParagraph.replace(
      nameRegex,
      nameTranslations[name]
    );
  });
  
  return translatedParagraph;
};

/**
 * Extract sections from an email content
 * @param {string} content - Full email content
 * @returns {Object} - Extracted sections
 */
export const extractSections = (content) => {
  // Header pattern
  const headerMatch = content.match(/===.*===\n/);
  const header = headerMatch ? headerMatch[0] : '';
  
  // Date pattern
  const dateMatch = header.match(/- (.+) ===/);
  const date = dateMatch ? dateMatch[1] : '';
  
  // Description paragraph
  const descriptionMatch = content.match(/===.*===\n\n(.*?)(?=\n\n---)/s);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  // Gigs section
  const gigsHeaderMatch = content.match(/--- GIGS NEAR YOU ---\n\n/);
  const gigsHeader = gigsHeaderMatch ? gigsHeaderMatch[0] : '';
  
  // Extract all gig items
  const gigItems = [];
  const gigPattern = /▶ \d+\..+?(?=▶|\n\n===|\n*$)/gs;
  let match;
  while ((match = gigPattern.exec(content)) !== null) {
    gigItems.push(match[0]);
  }
  
  // How to use section
  const howToUseMatch = content.match(/=== HOW TO USE ===\n(.*?)(?=\n\n---|$)/s);
  const howToUse = howToUseMatch ? howToUseMatch[0] : '';
  
  // Footer section
  const footerMatch = content.match(/---\n(.*?)$/s);
  const footer = footerMatch ? footerMatch[0] : '';
  
  // Subscriber info
  const subscriberMatch = footer.match(/sent to (.*?) at (.*?)\./);
  const subscriberName = subscriberMatch ? subscriberMatch[1] : '';
  const subscriberEmail = subscriberMatch ? subscriberMatch[2] : '';
  
  return {
    header,
    date,
    description,
    gigsHeader,
    gigItems,
    howToUse,
    footer,
    subscriberName,
    subscriberEmail
  };
};

/**
 * Translate a gig item
 * @param {string} gigItem - Gig item text
 * @param {string} targetLang - Target language
 * @returns {string} - Translated gig item
 */
const translateGigItem = (gigItem, targetLang) => {
  if (targetLang === 'ar') {
    console.log('Translating gig item to Arabic, full item:', gigItem);
  }
  
  // Parse the gig item to extract components
  const titleMatch = gigItem.match(/▶ (\d+)\. (.*?)(?=\n)/);
  const venueMatch = gigItem.match(/🏢 (.*?) \| (.*?)(?=\n)/);
  const addressMatch = gigItem.match(/📍 (.*?)(?=\n)/);
  const timeMatch = gigItem.match(/🕒 (.*?) \| 💲 (.*?)(?=\n)/);
  const genresMatch = gigItem.match(/🎵 (.*?)(?=\n)/);
  const mapUrlMatch = gigItem.match(/🗺️ (.*?)(?=\n)/);
  const qrUrlMatch = gigItem.match(/QR: (.*?)(?=\n)/);
  
  if (!titleMatch) {
    console.error('Failed to parse gig item title:', gigItem);
    return gigItem; // Can't parse, return original
  }
  
  if (targetLang === 'ar') {
    console.log('Parsed components:', {
      title: titleMatch ? titleMatch[2] : 'not found',
      venue: venueMatch ? venueMatch[1] : 'not found',
      distance: venueMatch ? venueMatch[2] : 'not found',
      address: addressMatch ? addressMatch[1] : 'not found',
      time: timeMatch ? timeMatch[1] : 'not found',
      price: timeMatch ? timeMatch[2] : 'not found'
    });
  }
  
  const num = titleMatch[1];
  const name = titleMatch[2];
  
  const venue = venueMatch ? venueMatch[1] : '';
  const distance = venueMatch ? venueMatch[2] : '';
  
  const address = addressMatch ? addressMatch[1] : '';
  
  const time = timeMatch ? timeMatch[1] : '';
  const price = timeMatch ? timeMatch[2] : '';
  
  const genres = genresMatch ? `   🎵 ${genresMatch[1]}` : '';
  
  const mapUrl = mapUrlMatch ? mapUrlMatch[1] : '';
  const qrUrl = qrUrlMatch ? qrUrlMatch[1] : '';
  
  // Translate components
  const lang = sentenceTranslations[targetLang] || {};
  
  // Build a new gig item with translated components
  // Note: We intentionally don't translate venue/artist names, addresses, URLs, etc.
  let translatedItem = `▶ ${num}. ${name}\n`;
  translatedItem += `   🏢 ${venue} | ${translateParagraph(distance, targetLang)}\n`;
  translatedItem += `   📍 ${address}\n`;
  
  // Translate price if it's a common term
  let translatedPrice = price;
  if (price === 'Free' && lang['Free']) {
    translatedPrice = lang['Free'];
  } else if (price === 'Check venue' && lang['Check venue']) {
    translatedPrice = lang['Check venue'];
  } else if (price === 'TBA' && lang['TBA']) {
    translatedPrice = lang['TBA'];
  }
  
  translatedItem += `   🕒 ${time} | 💲 ${translatedPrice}\n`;
  
  if (genres) {
    translatedItem += `${genres}\n`;
  }
  
  translatedItem += `   🗺️ ${mapUrl}\n`;
  
  // Handle QR label different for Arabic
  if (targetLang === 'ar') {
    console.log('Adding Arabic QR code label');
    
    // Fix for Arabic translation - ensure we're using the correct terms
    // Replace any instances of "مكان" (venue) that might be causing issues
    translatedItem = translatedItem.replace(/مكان/g, 'قاعة الحفلات');
    translatedItem = translatedItem.replace(/مكانًا/g, 'قاعة حفلات');
    
    // Replace any instances of "حفلة" (party/concert) with the more specific term
    translatedItem = translatedItem.replace(/حفلة/g, 'عرض موسيقي');
    translatedItem = translatedItem.replace(/حفلات/g, 'عروض موسيقية');
    
    translatedItem += `   رمز الاستجابة السريعة: ${qrUrl}\n`;
  } else {
    translatedItem += `   QR: ${qrUrl}\n`;
  }
  
  translatedItem += `   ----------------------`;
  
  return translatedItem;
};

/**
 * Translate the full email content using our sophisticated browser-based approach
 * @param {string} text - Full email content
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} - Translated content (Promise for API compatibility)
 */
export const translateWithBrowserLLM = async (text, targetLanguage) => {
  // Don't translate English
  if (targetLanguage === 'en') {
    return text;
  }
  
  // Check cache first
  const cachedResult = getCachedTranslation(text, 'en', targetLanguage);
  if (cachedResult) {
    console.log('Using cached translation');
    return cachedResult;
  }
  
  try {
    console.log(`Translating to ${targetLanguage}...`);
    console.log(`Text length: ${text.length} characters`);
    
    // Extract all sections from the content
    const sections = extractSections(text);
    
    // Translate each section
    let translatedContent = '';
    
    // Header (with the date preserved)
    if (targetLanguage === 'ar') {
      console.log('Adding Arabic header');
      // Use "دليل العروض الموسيقية" (music shows guide) instead of "دليل حفلات" (parties guide)
      translatedContent += `=== دليل العروض الموسيقية في ملبورن - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'ja') {
      translatedContent += `=== メルボルン ライブガイド - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'zh-CN') {
      translatedContent += `=== 墨尔本演出指南 - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'zh-TW') {
      translatedContent += `=== 墨爾本表演指南 - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'vi') {
      translatedContent += `=== HƯỚNG DẪN BUỔI DIỄN MELBOURNE - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'es') {
      translatedContent += `=== GUÍA DE CONCIERTOS DE MELBOURNE - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'de') {
      translatedContent += `=== MELBOURNE KONZERTFÜHRER - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'hi') {
      translatedContent += `=== मेलबर्न संगीत कार्यक्रम गाइड - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'ko') {
      translatedContent += `=== 멜버른 공연 가이드 - ${sections.date} ===\n\n`;
    } else {
      translatedContent += sections.header;
    }
    
    // Description paragraph (full paragraph translation)
    translatedContent += translateParagraph(sections.description, targetLanguage) + '\n\n';
    
    // Gigs near you header
    if (targetLanguage === 'ar') {
      console.log('Adding Arabic gigs near you header');
      // Use "عروض موسيقية" (music shows) instead of "حفلات" (parties)
      translatedContent += '--- عروض موسيقية بالقرب منك ---\n\n';
    } else if (targetLanguage === 'ja') {
      translatedContent += '--- あなたの近くのライブ ---\n\n';
    } else if (targetLanguage === 'zh-CN') {
      translatedContent += '--- 您附近的演出 ---\n\n';
    } else if (targetLanguage === 'zh-TW') {
      translatedContent += '--- 您附近的表演 ---\n\n';
    } else if (targetLanguage === 'vi') {
      translatedContent += '--- BUỔI DIỄN GẦN BẠN ---\n\n';
    } else if (targetLanguage === 'es') {
      translatedContent += '--- CONCIERTOS CERCA DE TI ---\n\n';
    } else if (targetLanguage === 'de') {
      translatedContent += '--- KONZERTE IN DEINER NÄHE ---\n\n';
    } else if (targetLanguage === 'hi') {
      translatedContent += '--- आपके पास संगीत कार्यक्रम ---\n\n';
    } else if (targetLanguage === 'ko') {
      translatedContent += '--- 가까운 공연 ---\n\n';
    } else {
      translatedContent += sections.gigsHeader;
    }
    
    // Gig items (structured translation)
    console.log(`Translating ${sections.gigItems.length} gig items for ${targetLanguage}`);
    sections.gigItems.forEach((gigItem, index) => {
      if (targetLanguage === 'ar') {
        console.log(`Arabic translation for gig item ${index + 1}:`);
        console.log('Original:', gigItem.substring(0, 50) + '...');
      }
      const translatedItem = translateGigItem(gigItem, targetLanguage);
      if (targetLanguage === 'ar') {
        console.log('Translated:', translatedItem.substring(0, 50) + '...');
      }
      translatedContent += translatedItem;
      if (index < sections.gigItems.length - 1) {
        translatedContent += '\n\n';
      }
    });
    
    // How to use section
    translatedContent += '\n\n';
    if (targetLanguage === 'ar') {
      console.log('Adding Arabic how to use section');
      translatedContent += '=== كيفية الاستخدام ===\n';
      translatedContent += '• عرض على الهاتف المحمول لمسح رموز الاستجابة السريعة مباشرة من الشاشة\n';
      translatedContent += '• رموز الاستجابة السريعة تربط بمواقع الأماكن على خرائط جوجل\n';
      translatedContent += '• شارك هذا الدليل مع الأصدقاء!\n\n';
      console.log('Arabic how to use section added');
    } else if (targetLanguage === 'ja') {
      translatedContent += '=== 使い方 ===\n';
      translatedContent += '• モバイルで表示してQRコードを直接スキャン\n';
      translatedContent += '• QRコードは会場の場所へのリンク\n';
      translatedContent += '• このガイドを友達と共有しましょう！\n\n';
    } else if (targetLanguage === 'zh-CN') {
      translatedContent += '=== 使用方法 ===\n';
      translatedContent += '• 在移动设备上查看以直接从屏幕扫描二维码\n';
      translatedContent += '• 二维码链接到Google地图上的场地位置\n';
      translatedContent += '• 与朋友分享此指南！\n\n';
    } else if (targetLanguage === 'zh-TW') {
      translatedContent += '=== 使用方法 ===\n';
      translatedContent += '• 在移動設備上查看以直接從屏幕掃描二維碼\n';
      translatedContent += '• 二維碼鏈接到Google地圖上的場地位置\n';
      translatedContent += '• 與朋友分享此指南！\n\n';
    } else if (targetLanguage === 'vi') {
      translatedContent += '=== CÁCH SỬ DỤNG ===\n';
      translatedContent += '• Xem trên điện thoại di động để quét mã QR trực tiếp từ màn hình\n';
      translatedContent += '• Mã QR liên kết đến vị trí địa điểm trên Google Maps\n';
      translatedContent += '• Chia sẻ hướng dẫn này với bạn bè!\n\n';
    } else if (targetLanguage === 'es') {
      translatedContent += '=== CÓMO USAR ===\n';
      translatedContent += '• Ver en el móvil para escanear códigos QR directamente desde la pantalla\n';
      translatedContent += '• Los códigos QR enlazan a las ubicaciones de los locales en Google Maps\n';
      translatedContent += '• ¡Comparte esta guía con amigos!\n\n';
    } else if (targetLanguage === 'de') {
      translatedContent += '=== ANLEITUNG ===\n';
      translatedContent += '• Auf dem Mobilgerät ansehen, um QR-Codes direkt vom Bildschirm zu scannen\n';
      translatedContent += '• QR-Codes verlinken zu Veranstaltungsorten auf Google Maps\n';
      translatedContent += '• Teile diesen Führer mit Freunden!\n\n';
    } else if (targetLanguage === 'hi') {
      translatedContent += '=== उपयोग कैसे करें ===\n';
      translatedContent += '• स्क्रीन से सीधे QR कोड स्कैन करने के लिए मोबाइल पर देखें\n';
      translatedContent += '• QR कोड Google Maps पर स्थल स्थानों से जुड़ते हैं\n';
      translatedContent += '• इस गाइड को दोस्तों के साथ साझा करें!\n\n';
    } else if (targetLanguage === 'ko') {
      translatedContent += '=== 사용 방법 ===\n';
      translatedContent += '• 화면에서 직접 QR 코드를 스캔하려면 모바일에서 보기\n';
      translatedContent += '• QR 코드는 Google 지도의 공연장 위치로 연결됩니다\n';
      translatedContent += '• 이 가이드를 친구들과 공유하세요!\n\n';
    } else {
      const howToUseLines = sections.howToUse.split('\n');
      const translatedLines = howToUseLines.map(line => 
        translateParagraph(line, targetLanguage)
      );
      translatedContent += translatedLines.join('\n');
    }
    
    // Footer (with subscriber info preserved)
    if (targetLanguage === 'ar') {
      console.log('Adding Arabic footer section');
      translatedContent += '---\n';
      translatedContent += `تم إرسال هذه المعلومات إلى ${sections.subscriberName} على ${sections.subscriberEmail}.\n`;
      // Use "دليل العروض الموسيقية" (music shows guide) instead of "دليل حفلات" (parties guide)
      translatedContent += 'دليل العروض الموسيقية في ملبورن - دعم الموسيقى المحلية وقاعات الحفلات.\n';
      console.log('Arabic footer section added');
    } else if (targetLanguage === 'ja') {
      translatedContent += '---\n';
      translatedContent += `この情報は${sections.subscriberName}（${sections.subscriberEmail}）に送信されました。\n`;
      translatedContent += 'メルボルンライブガイド - 地元の音楽と会場をサポートしています。\n';
    } else if (targetLanguage === 'zh-CN') {
      translatedContent += '---\n';
      translatedContent += `此信息已发送至${sections.subscriberName}（${sections.subscriberEmail}）。\n`;
      translatedContent += '墨尔本演出指南 - 支持本地音乐和场地。\n';
    } else if (targetLanguage === 'zh-TW') {
      translatedContent += '---\n';
      translatedContent += `此信息已發送至${sections.subscriberName}（${sections.subscriberEmail}）。\n`;
      translatedContent += '墨爾本表演指南 - 支持本地音樂和場地。\n';
    } else if (targetLanguage === 'vi') {
      translatedContent += '---\n';
      translatedContent += `Thông tin này đã được gửi đến ${sections.subscriberName} tại ${sections.subscriberEmail}.\n`;
      translatedContent += 'Hướng Dẫn Buổi Diễn Melbourne - Hỗ trợ âm nhạc và địa điểm địa phương.\n';
    } else if (targetLanguage === 'es') {
      translatedContent += '---\n';
      translatedContent += `Esta información fue enviada a ${sections.subscriberName} en ${sections.subscriberEmail}.\n`;
      translatedContent += 'Guía de Conciertos de Melbourne - Apoyando la música local y los locales.\n';
    } else if (targetLanguage === 'de') {
      translatedContent += '---\n';
      translatedContent += `Diese Information wurde gesendet an ${sections.subscriberName} unter ${sections.subscriberEmail}.\n`;
      translatedContent += 'Melbourne Konzertführer - Unterstützung lokaler Musik und Veranstaltungsorte.\n';
    } else if (targetLanguage === 'hi') {
      translatedContent += '---\n';
      translatedContent += `यह जानकारी ${sections.subscriberName} को ${sections.subscriberEmail} पर भेजी गई थी।\n`;
      translatedContent += 'मेलबर्न संगीत कार्यक्रम गाइड - स्थानीय संगीत और स्थलों का समर्थन।\n';
    } else if (targetLanguage === 'ko') {
      translatedContent += '---\n';
      translatedContent += `이 정보는 ${sections.subscriberName}에게 ${sections.subscriberEmail}로 전송되었습니다.\n`;
      translatedContent += '멜버른 공연 가이드 - 지역 음악과 공연장 지원.\n';
    } else {
      const footerLines = sections.footer.split('\n');
      const translatedFooterLines = footerLines.map(line => 
        translateParagraph(line, targetLanguage)
      );
      translatedContent += translatedFooterLines.join('\n');
    }
    
    // Check if content is being truncated
    console.log(`Final translated content length: ${translatedContent.length} characters`);
    if (targetLanguage === 'ar') {
      console.log('Final Arabic content preview:');
      console.log(translatedContent.substring(0, 100) + '...');
      console.log('...', translatedContent.substring(translatedContent.length - 100));
    }
    
    // For Arabic, do a final pass to ensure all instances are properly translated
    if (targetLanguage === 'ar') {
      console.log('Performing final Arabic translation fixes');
      
      // Replace any remaining instances of "مكان" (venue) with "قاعة الحفلات" (concert hall)
      translatedContent = translatedContent.replace(/مكان/g, 'قاعة الحفلات');
      translatedContent = translatedContent.replace(/مكانًا/g, 'قاعة حفلات');
      
      // Replace any remaining instances of "حفلة" (party/concert) with "عرض موسيقي" (musical show)
      translatedContent = translatedContent.replace(/حفلة/g, 'عرض موسيقي');
      translatedContent = translatedContent.replace(/حفلات/g, 'عروض موسيقية');
      
      // Replace "دليل حفلات" (parties guide) with "دليل العروض الموسيقية" (music shows guide)
      translatedContent = translatedContent.replace(/دليل حفلات/g, 'دليل العروض الموسيقية');
    }
    
    // Cache the result
    setCachedTranslation(text, 'en', targetLanguage, translatedContent);
    
    return translatedContent;
  } catch (error) {
    console.error(`Translation to ${targetLanguage} failed:`, error);
    // Fall back to basic translation
    return `[${targetLanguage}]\n\n${text}`;
  }
};