import React, { createContext, useContext, useState, useEffect } from 'react';

export type LanguageCode = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Nav & Tabs
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.accounts': 'Accounts & Wallets',
    'nav.budgets': 'Budgets',
    'nav.analytics': 'Analytics & Charts',
    'nav.savings': 'Savings Goals',
    'nav.bills': 'Bills & Recurring',
    'nav.notifications': 'Alerts & Notices',
    'nav.reports': 'Reports & Export',
    'nav.settings': 'Settings & Themes',
    'nav.aiAssistant': 'AI Assistant',

    // Global Actions
    'action.recordTx': 'Record Transaction',
    'action.addTx': 'Add Transaction',
    'action.scanReceipt': 'Scan Receipt',
    'action.importStatement': 'Import Statement',
    'action.exportCsv': 'Export CSV',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.create': 'Create',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.viewAll': 'View all',
    'action.manage': 'Manage',
    'action.logout': 'Logout',
    'action.send': 'Send',
    'action.clear': 'Clear',
    'action.retry': 'Retry Sync',

    // Dashboard
    'dashboard.title': 'Financial Health Overview',
    'dashboard.subtitle': 'Real-time telemetry and ledger metrics',
    'dashboard.availableBalance': 'Available Balance',
    'dashboard.periodIncome': 'Period Income',
    'dashboard.periodExpenses': 'Period Expenses',
    'dashboard.netCashFlow': 'Net Cash Flow',
    'dashboard.budgetUtilization': 'Monthly Budget Utilization',
    'dashboard.savingsProgress': 'Savings Target Progress',
    'dashboard.cashFlowDynamics': 'Cash Flow Dynamics',
    'dashboard.categoryAllocation': 'Category Allocation',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.upcomingBills': 'Upcoming Bills',
    'dashboard.healthScore': 'Financial Health Score',
    'dashboard.healthScoreDesc': 'Composite rating based on savings rate, budget discipline, liquidity buffer, and punctuality',

    // Accounts
    'accounts.title': 'Accounts & Wallets',
    'accounts.subtitle': 'Manage your bank accounts, credit cards, cash, and digital wallets',
    'accounts.addAccount': 'Add Account',
    'accounts.totalAssets': 'Total Liquid Assets',
    'accounts.totalLiabilities': 'Total Liabilities',
    'accounts.netWorth': 'Net Account Balance',

    // AI Assistant
    'ai.title': 'AI Financial Assistant',
    'ai.subtitle': 'Get instant answers and actionable insights about your spending, budgets, and savings',
    'ai.inputPlaceholder': 'Ask anything about your finances, budgets, or expenses...',
    'ai.suggestedTitle': 'Suggested Questions',
    'ai.clearConversation': 'Clear Conversation',

    // Settings & Bank Connections
    'settings.title': 'Settings & Themes',
    'settings.preferences': 'Preferences & Localization',
    'settings.language': 'Application Language',
    'settings.currency': 'Default Currency',
    'settings.themes': 'Design Themes & Accents',
    'settings.bankConnections': 'Bank Connections (Open Banking)',
    'settings.bankDesc': 'Direct account synchronization requires an authorized Open Banking / Account Aggregator provider.',
    'settings.statusNotConnected': 'No Authorized Provider Configured',

    // Common Words
    'common.all': 'All',
    'common.income': 'Income',
    'common.expense': 'Expense',
    'common.transfer': 'Transfer',
    'common.loading': 'Loading...',
    'common.daysRemaining': 'days remaining',
  },

  ta: {
    // Nav & Tabs
    'nav.dashboard': 'முகப்பு பலகை',
    'nav.transactions': 'பரிவர்த்தனைகள்',
    'nav.accounts': 'கணக்குகள் & பணப்பைகள்',
    'nav.budgets': 'பட்ஜெட்டுகள்',
    'nav.analytics': 'பகுப்பாய்வு & வரைபடங்கள்',
    'nav.savings': 'சேமிப்பு இலக்குகள்',
    'nav.bills': 'கட்டணங்கள் & பில்கள்',
    'nav.notifications': 'எச்சரிக்கைகள் & அறிவிப்புகள்',
    'nav.reports': 'அறிக்கைகள் & ஏற்றுமதி',
    'nav.settings': 'அமைப்புகள் & தீம்கள்',
    'nav.aiAssistant': 'AI உதவியாளர்',

    // Global Actions
    'action.recordTx': 'பரிவர்த்தனை பதிவு செய்',
    'action.addTx': 'பரிவர்த்தனை சேர்',
    'action.scanReceipt': 'ரசீது ஸ்கேன் செய்',
    'action.importStatement': 'வங்கி அறிக்கை இறக்குமதி',
    'action.exportCsv': 'CSV ஏற்றுமதி',
    'action.save': 'சேமிக்க',
    'action.cancel': 'ரத்து செய்',
    'action.delete': 'நீக்கு',
    'action.edit': 'திருத்து',
    'action.create': 'உருவாக்கு',
    'action.search': 'தேடுக',
    'action.filter': 'வடிகட்டுக',
    'action.viewAll': 'அனைத்தையும் பார்',
    'action.manage': 'நிர்வகி',
    'action.logout': 'வெளியேறு',
    'action.send': 'அனுப்பு',
    'action.clear': 'அழி',
    'action.retry': 'மீண்டும் முயற்சி செய்',

    // Dashboard
    'dashboard.title': 'நிதி ஆரோக்கிய கண்ணோட்டம்',
    'dashboard.subtitle': 'நிகழ்நேர நிதி நிலை மற்றும் பரிவர்த்தனை அளவீடுகள்',
    'dashboard.availableBalance': 'கிடைக்கக்கூடிய இருப்பு',
    'dashboard.periodIncome': 'கால வருமானம்',
    'dashboard.periodExpenses': 'கால செலவுகள்',
    'dashboard.netCashFlow': 'நிகர பணப்புழக்கம்',
    'dashboard.budgetUtilization': 'மாதாந்திர பட்ஜெட் பயன்பாடு',
    'dashboard.savingsProgress': 'சேமிப்பு இலக்கு முன்னேற்றம்',
    'dashboard.cashFlowDynamics': 'பணப்புழக்க இயக்கவியல்',
    'dashboard.categoryAllocation': 'வகைப்பிரிவு ஒதுக்கீடு',
    'dashboard.recentTransactions': 'சமீபத்திய பரிவர்த்தனைகள்',
    'dashboard.upcomingBills': 'வரவிருக்கும் பில்கள்',
    'dashboard.healthScore': 'நிதி ஆரோக்கிய மதிப்பெண்',
    'dashboard.healthScoreDesc': 'சேமிப்பு விகிதம், பட்ஜெட் ஒழுக்கம் மற்றும் பண இருப்பு ஆகியவற்றின் அடிப்படையிலான மதிப்பீடு',

    // Accounts
    'accounts.title': 'கணக்குகள் & பணப்பைகள்',
    'accounts.subtitle': 'உங்கள் வங்கி கணக்குகள், கிரெடிட் கார்டுகள் மற்றும் பணப்பைகளை நிர்வகிக்கவும்',
    'accounts.addAccount': 'கணக்கு சேர்',
    'accounts.totalAssets': 'மொத்த திரவ சொத்துக்கள்',
    'accounts.totalLiabilities': 'மொத்த பொறுப்புகள்',
    'accounts.netWorth': 'நிகர கணக்கு இருப்பு',

    // AI Assistant
    'ai.title': 'AI நிதி உதவியாளர்',
    'ai.subtitle': 'உங்கள் செலவுகள், பட்ஜெட்டுகள் மற்றும் சேமிப்பு பற்றிய உடனடி பதில்களைப் பெறுங்கள்',
    'ai.inputPlaceholder': 'உங்கள் நிதி அல்லது பட்ஜெட் பற்றி கேளுங்கள்...',
    'ai.suggestedTitle': 'பரிந்துரைக்கப்பட்ட கேள்விகள்',
    'ai.clearConversation': 'உரையாடலை அழி',

    // Settings & Bank Connections
    'settings.title': 'அமைப்புகள் & தீம்கள்',
    'settings.preferences': 'விருப்பத்தேர்வுகள் & மொழி',
    'settings.language': 'பயன்பாட்டு மொழி',
    'settings.currency': 'இயல்புநிலை நாணயம்',
    'settings.themes': 'வடிவமைப்பு தீம்கள் & வண்ணங்கள்',
    'settings.bankConnections': 'வங்கி இணைப்புகள் (ஓபன் பேங்கிங்)',
    'settings.bankDesc': 'நேரடி வங்கி ஒத்திசைவுக்கு அங்கீகரிக்கப்பட்ட கணக்கு ஒருங்கிணைப்பாளர் தேவை.',
    'settings.statusNotConnected': 'வங்கி வழங்குநர் இணைக்கப்படவில்லை',

    // Common Words
    'common.all': 'அனைத்தும்',
    'common.income': 'வருமானம்',
    'common.expense': 'செலவு',
    'common.transfer': 'பரிமாற்றம்',
    'common.loading': 'ஏற்றுகிறது...',
    'common.daysRemaining': 'நாட்கள் மீதமுள்ளன',
  },

  hi: {
    // Nav & Tabs
    'nav.dashboard': 'डैशबोर्ड',
    'nav.transactions': 'लेन-देन',
    'nav.accounts': 'खाते और वॉलेट',
    'nav.budgets': 'बजट',
    'nav.analytics': 'एनालिटिक्स और चार्ट',
    'nav.savings': 'बचत लक्ष्य',
    'nav.bills': 'बिल और आवर्ती भुगतान',
    'nav.notifications': 'अलर्ट और सूचनाएं',
    'nav.reports': 'रिपोर्ट और निर्यात',
    'nav.settings': 'सेटिंग्स और थीम',
    'nav.aiAssistant': 'एआई सहायक',

    // Global Actions
    'action.recordTx': 'लेन-देन दर्ज करें',
    'action.addTx': 'लेन-देन जोड़ें',
    'action.scanReceipt': 'रसीद स्कैन करें',
    'action.importStatement': 'बैंक स्टेटमेंट आयात करें',
    'action.exportCsv': 'CSV निर्यात करें',
    'action.save': 'सुरक्षित करें',
    'action.cancel': 'रद्द करें',
    'action.delete': 'हटाएं',
    'action.edit': 'संपादित करें',
    'action.create': 'बनाएं',
    'action.search': 'खोजें',
    'action.filter': 'फ़िल्टर करें',
    'action.viewAll': 'सभी देखें',
    'action.manage': 'प्रबंधित करें',
    'action.logout': 'लॉग आउट',
    'action.send': 'भेजें',
    'action.clear': 'साफ़ करें',
    'action.retry': 'पुनः प्रयास करें',

    // Dashboard
    'dashboard.title': 'वित्तीय स्वास्थ्य अवलोकन',
    'dashboard.subtitle': 'वास्तविक समय वित्तीय आंकड़े और खाता बही',
    'dashboard.availableBalance': 'उपलब्ध शेष राशि',
    'dashboard.periodIncome': 'अवधि की आय',
    'dashboard.periodExpenses': 'अवधि के व्यय',
    'dashboard.netCashFlow': 'शुद्ध नकदी प्रवाह',
    'dashboard.budgetUtilization': 'मासिक बजट उपयोग',
    'dashboard.savingsProgress': 'बचत लक्ष्य प्रगति',
    'dashboard.cashFlowDynamics': 'नकदी प्रवाह विश्लेषण',
    'dashboard.categoryAllocation': 'श्रेणी आवंटन',
    'dashboard.recentTransactions': 'हाल के लेन-देन',
    'dashboard.upcomingBills': 'आगामी बिल',
    'dashboard.healthScore': 'वित्तीय स्वास्थ्य स्कोर',
    'dashboard.healthScoreDesc': 'बचत दर, बजट अनुशासन, आपातकालीन बफर और समयबद्धता पर आधारित रेटिंग',

    // Accounts
    'accounts.title': 'खाते और वॉलेट',
    'accounts.subtitle': 'अपने बैंक खाते, क्रेडिट कार्ड और डिजिटल वॉलेट प्रबंधित करें',
    'accounts.addAccount': 'खाता जोड़ें',
    'accounts.totalAssets': 'कुल तरल संपत्ति',
    'accounts.totalLiabilities': 'कुल देनदारियां',
    'accounts.netWorth': 'शुद्ध खाता शेष',

    // AI Assistant
    'ai.title': 'एआई वित्तीय सहायक',
    'ai.subtitle': 'अपने खर्च, बजट और बचत के बारे में तुरंत उत्तर और सुझाव प्राप्त करें',
    'ai.inputPlaceholder': 'अपने वित्त या खर्चों के बारे में कुछ भी पूछें...',
    'ai.suggestedTitle': 'सुझाए गए प्रश्न',
    'ai.clearConversation': 'बातचीत साफ़ करें',

    // Settings & Bank Connections
    'settings.title': 'सेटिंग्स और थीम',
    'settings.preferences': 'प्राथमिकताएं और स्थानीयकरण',
    'settings.language': 'एप्लिकेशन भाषा',
    'settings.currency': 'डिफ़ॉल्ट मुद्रा',
    'settings.themes': 'डिज़ाइन थीम और रंग',
    'settings.bankConnections': 'बैंक कनेक्शन (ओपन बैंकिंग)',
    'settings.bankDesc': 'प्रत्यक्ष बैंक सिंक के लिए एक अधिकृत खाता एग्रीगेटर की आवश्यकता होती है।',
    'settings.statusNotConnected': 'कोई अधिकृत प्रदाता कॉन्फ़िगर नहीं है',

    // Common Words
    'common.all': 'सभी',
    'common.income': 'आय',
    'common.expense': 'खर्च',
    'common.transfer': 'स्थानांतरण',
    'common.loading': 'लोड हो रहा है...',
    'common.daysRemaining': 'दिन शेष',
  },

  te: {
    // Nav & Tabs
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.transactions': 'లావాదేవీలు',
    'nav.accounts': 'ఖాతాలు & వాలెట్లు',
    'nav.budgets': 'బడ్జెట్లు',
    'nav.analytics': 'విశ్లేషణ & చార్ట్‌లు',
    'nav.savings': 'పొదుపు లక్ష్యాలు',
    'nav.bills': 'బిల్లులు & పునరావృత చెల్లింపులు',
    'nav.notifications': 'హెచ్చరికలు & నోటీసులు',
    'nav.reports': 'నివేదికలు & ఎగుమతి',
    'nav.settings': 'సెట్టింగ్‌లు & థీమ్‌లు',
    'nav.aiAssistant': 'AI సహాయకుడు',

    // Global Actions
    'action.recordTx': 'లావాదేవీని నమోదు చేయండి',
    'action.addTx': 'లావాదేవీని జోడించండి',
    'action.scanReceipt': 'రసీదుని స్కాన్ చేయండి',
    'action.importStatement': 'బ్యాంక్ స్టేట్‌మెంట్‌ను దిగుమతి చేయండి',
    'action.exportCsv': 'CSV ఎగుమతి',
    'action.save': 'భద్రపరచు',
    'action.cancel': 'రద్దు చేయి',
    'action.delete': 'తొలగించు',
    'action.edit': 'సవరించు',
    'action.create': 'సృష్టించు',
    'action.search': 'వెతకండి',
    'action.filter': 'ఫిల్టర్ చేయండి',
    'action.viewAll': 'అన్నీ చూడండి',
    'action.manage': 'నిర్వహించండి',
    'action.logout': 'లాగ్ అవుట్',
    'action.send': 'పంపు',
    'action.clear': 'క్లియర్ చేయి',
    'action.retry': 'మళ్ళీ ప్రయత్నించండి',

    // Dashboard
    'dashboard.title': 'ఆర్థిక ఆరోగ్య అవలోకనం',
    'dashboard.subtitle': 'నిజ-సమయ లెడ్జర్ కొలమానాలు మరియు నగదు ప్రవాహం',
    'dashboard.availableBalance': 'అందుబాటులో ఉన్న బ్యాలెన్స్',
    'dashboard.periodIncome': 'కాల వ్యవధి ఆదాయం',
    'dashboard.periodExpenses': 'కాల వ్యవధి ఖర్చులు',
    'dashboard.netCashFlow': 'నికర నగదు ప్రవాహం',
    'dashboard.budgetUtilization': 'నెలవారీ బడ్జెట్ వినియోగం',
    'dashboard.savingsProgress': 'పొదుపు లక్ష్య పురోగతి',
    'dashboard.cashFlowDynamics': 'నగదు ప్రవాహ గతిశీలత',
    'dashboard.categoryAllocation': 'వర్గ కేటాయింపు',
    'dashboard.recentTransactions': 'ఇటీవలి లావాదేవీలు',
    'dashboard.upcomingBills': 'రాబోయే బిల్లులు',
    'dashboard.healthScore': 'ఆర్థిక ఆరోగ్య స్కోర్',
    'dashboard.healthScoreDesc': 'పొదుపు రేటు, బడ్జెట్ క్రమశిక్షణ మరియు లిక్విడిటీ ఆధారంగా రేటింగ్',

    // Accounts
    'accounts.title': 'ఖాతాలు & వాలెట్లు',
    'accounts.subtitle': 'మీ బ్యాంక్ ఖాతాలు, క్రెడిట్ కార్డులు మరియు డిజిటల్ వాలెట్లను నిర్వహించండి',
    'accounts.addAccount': 'ఖాతాను జోడించండి',
    'accounts.totalAssets': 'మొత్తం ఆస్తులు',
    'accounts.totalLiabilities': 'మొత్తం బాధ్యతలు',
    'accounts.netWorth': 'నికర ఖాతా బ్యాలెన్స్',

    // AI Assistant
    'ai.title': 'AI ఆర్థిక సహాయకుడు',
    'ai.subtitle': 'మీ ఖర్చులు, బడ్జెట్లు మరియు పొదుపుల గురించి తక్షణ సమాధానాలు పొందండి',
    'ai.inputPlaceholder': 'మీ ఆర్థిక విషయాల గురించి ఏదైనా అడగండి...',
    'ai.suggestedTitle': 'సూచించిన ప్రశ్నలు',
    'ai.clearConversation': 'సంభాషణను క్లియర్ చేయండి',

    // Settings & Bank Connections
    'settings.title': 'సెట్టింగ్‌లు & థీమ్‌లు',
    'settings.preferences': 'ప్రాధాన్యతలు & భాష',
    'settings.language': 'అప్లికేషన్ భాష',
    'settings.currency': 'డిఫాల్ట్ కరెన్సీ',
    'settings.themes': 'డిజైన్ థీమ్‌లు & రంగులు',
    'settings.bankConnections': 'బ్యాంక్ కనెక్షన్‌లు (ఓపెన్ బ్యాంకింగ్)',
    'settings.bankDesc': 'లైవ్ బ్యాంక్ సింక్ కోసం అధీకృత ఖాతా అగ్రిగేటర్ అవసరం.',
    'settings.statusNotConnected': 'ఏ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు',

    // Common Words
    'common.all': 'అన్నీ',
    'common.income': 'ఆదాయం',
    'common.expense': 'ఖర్చు',
    'common.transfer': 'బదిలీ',
    'common.loading': 'లోడ్ అవుతోంది...',
    'common.daysRemaining': 'రోజులు మిగిలి ఉన్నాయి',
  },

  ml: {
    // Nav & Tabs
    'nav.dashboard': 'ഡാഷ്‌ബോർഡ്',
    'nav.transactions': 'ഇടപാടുകൾ',
    'nav.accounts': 'അക്കൗണ്ടുകളും വാലറ്റുകളും',
    'nav.budgets': 'ബജറ്റുകൾ',
    'nav.analytics': 'അനലിറ്റിക്സും ചാർട്ടുകളും',
    'nav.savings': 'സമ്പാദ്യ ലക്ഷ്യങ്ങൾ',
    'nav.bills': 'ബില്ലുകളും ആവർത്തിച്ചുള്ള പേയ്മെന്റുകളും',
    'nav.notifications': 'അലേർട്ടുകളും അറിയിപ്പുകളും',
    'nav.reports': 'റിപ്പോർട്ടുകളും കയറ്റുമതിയും',
    'nav.settings': 'ക്രമീകരണങ്ങളും തീമുകളും',
    'nav.aiAssistant': 'AI അസിസ്റ്റന്റ്',

    // Global Actions
    'action.recordTx': 'ഇടപാട് രേഖപ്പെടുത്തുക',
    'action.addTx': 'ഇടപാട് ചേർക്കുക',
    'action.scanReceipt': 'രസീത് സ്കാൻ ചെയ്യുക',
    'action.importStatement': 'ബാങ്ക് സ്റ്റേറ്റ്മെന്റ് ഇറക്കുമതി ചെയ്യുക',
    'action.exportCsv': 'CSV കയറ്റുമതി',
    'action.save': 'സൂക്ഷിക്കുക',
    'action.cancel': 'റദ്ദാക്കുക',
    'action.delete': 'ഇല്ലാതാക്കുക',
    'action.edit': 'തിരുത്തുക',
    'action.create': 'ഉണ്ടാക്കുക',
    'action.search': 'തിരയുക',
    'action.filter': 'ഫിൽട്ടർ ചെയ്യുക',
    'action.viewAll': 'എല്ലാം കാണുക',
    'action.manage': 'നിയന്ത്രിക്കുക',
    'action.logout': 'ലോഗ് ഔട്ട്',
    'action.send': 'അയക്കുക',
    'action.clear': 'മായ്ക്കുക',
    'action.retry': 'വീണ്ടും ശ്രമിക്കുക',

    // Dashboard
    'dashboard.title': 'സാമ്പത്തിക ആരോഗ്യ അവലോകനം',
    'dashboard.subtitle': 'തത്സമയ ലെഡ്ജർ സൂചികകളും പണമിടപാടുകളും',
    'dashboard.availableBalance': 'ലഭ്യമായ ബാലൻസ്',
    'dashboard.periodIncome': 'കാലയളവിലെ വരുമാനം',
    'dashboard.periodExpenses': 'കാലയളവിലെ ചെലവുകൾ',
    'dashboard.netCashFlow': 'അറ്റ പണമൊഴുക്ക്',
    'dashboard.budgetUtilization': 'പ്രതിമാസ ബജറ്റ് വിനിയോഗം',
    'dashboard.savingsProgress': 'സമ്പാദ്യ ലക്ഷ്യ പുരോഗതി',
    'dashboard.cashFlowDynamics': 'പണമൊഴുക്ക് ഡൈനാമിക്സ്',
    'dashboard.categoryAllocation': 'വിഭാഗ വിഹിതം',
    'dashboard.recentTransactions': 'സമീപകാല ഇടപാടുകൾ',
    'dashboard.upcomingBills': 'വരാനിരിക്കുന്ന ബില്ലുകൾ',
    'dashboard.healthScore': 'സാമ്പത്തിക ആരോഗ്യ സ്കോർ',
    'dashboard.healthScoreDesc': 'സമ്പാദ്യ നിരക്ക്, ബജറ്റ് അച്ചടക്കം, ലിക്വിഡിറ്റി എന്നിവ അടിസ്ഥാനമാക്കിയുള്ള റേറ്റിംഗ്',

    // Accounts
    'accounts.title': 'അക്കൗണ്ടുകളും വാലറ്റുകളും',
    'accounts.subtitle': 'നിങ്ങളുടെ ബാങ്ക് അക്കൗണ്ടുകൾ, ക്രെഡിറ്റ് കാർഡുകൾ, വാലറ്റുകൾ എന്നിവ നിയന്ത്രിക്കുക',
    'accounts.addAccount': 'അക്കൗണ്ട് ചേർക്കുക',
    'accounts.totalAssets': 'ആകെ ആസ്തികൾ',
    'accounts.totalLiabilities': 'ആകെ ബാധ്യതകൾ',
    'accounts.netWorth': 'അറ്റ അക്കൗണ്ട് ബാലൻസ്',

    // AI Assistant
    'ai.title': 'AI സാമ്പത്തിക സഹായി',
    'ai.subtitle': 'നിങ്ങളുടെ ചെലവുകൾ, ബജറ്റുകൾ, സമ്പാദ്യം എന്നിവയെക്കുറിച്ച് തത്സമയ വിവരങ്ങൾ നേടുക',
    'ai.inputPlaceholder': 'നിങ്ങളുടെ സാമ്പത്തിക കാര്യങ്ങളെക്കുറിച്ച് എന്തും ചോദിക്കൂ...',
    'ai.suggestedTitle': 'നിർദ്ദേശിച്ച ചോദ്യങ്ങൾ',
    'ai.clearConversation': 'സംഭാഷണം മായ്ക്കുക',

    // Settings & Bank Connections
    'settings.title': 'ക്രമീകരണങ്ങളും തീമുകളും',
    'settings.preferences': 'മുൻഗണനകളും ഭാഷയും',
    'settings.language': 'ആപ്പ് ഭാഷ',
    'settings.currency': 'സ്ഥിര കറൻസി',
    'settings.themes': 'ഡിസൈൻ തീമുകളും നിറങ്ങളും',
    'settings.bankConnections': 'ബാങ്ക് കണക്ഷനുകൾ (ഓപ്പൺ ബാങ്കിംഗ്)',
    'settings.bankDesc': 'തത്സമയ ബാങ്ക് സമന്വയത്തിന് അംഗീകൃത അക്കൗണ്ട് അഗ്രഗേറ്റർ ആവശ്യമാണ്.',
    'settings.statusNotConnected': 'ബാങ്ക് പ്രൊവൈഡർ ബന്ധിപ്പിച്ചിട്ടില്ല',

    // Common Words
    'common.all': 'എല്ലാം',
    'common.income': 'വരുമാനം',
    'common.expense': 'ചെലവ്',
    'common.transfer': 'കൈമാറ്റം',
    'common.loading': 'ലോഡ് ചെയ്യുന്നു...',
    'common.daysRemaining': 'ദിവസങ്ങൾ ബാക്കിയുണ്ട്',
  },

  kn: {
    // Nav & Tabs
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.transactions': 'ವಹಿವಾಟುಗಳು',
    'nav.accounts': 'ಖಾತೆಗಳು ಮತ್ತು ವಾಲೆಟ್‌ಗಳು',
    'nav.budgets': 'ಬಜೆಟ್‌ಗಳು',
    'nav.analytics': 'ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಚಾರ್ಟ್‌ಗಳು',
    'nav.savings': 'ಉಳಿತಾಯ ಗುರಿಗಳು',
    'nav.bills': 'ಬಿಲ್ಲುಗಳು ಮತ್ತು ಮರುಕಳಿಸುವ ಪಾವತಿಗಳು',
    'nav.notifications': 'ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಪ್ರಕಟಣೆಗಳು',
    'nav.reports': 'ವರದಿಗಳು ಮತ್ತು ರಫ್ತು',
    'nav.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಥೀಮ್‌ಗಳು',
    'nav.aiAssistant': 'AI ಸಹಾಯಕ',

    // Global Actions
    'action.recordTx': 'ವಹಿವಾಟು ದಾಖಲಿಸಿ',
    'action.addTx': 'ವಹಿವಾಟು ಸೇರಿಸಿ',
    'action.scanReceipt': 'ರಶೀದಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    'action.importStatement': 'ಬ್ಯಾಂಕ್ ಸ್ಟೇಟ್‌ಮೆಂಟ್ ಆಮದು ಮಾಡಿ',
    'action.exportCsv': 'CSV ರಫ್ತು ಮಾಡಿ',
    'action.save': 'ಉಳಿಸಿ',
    'action.cancel': 'ರದ್ದುಮಾಡಿ',
    'action.delete': 'ಅಳಿಸಿ',
    'action.edit': 'ತಿದ್ದುಪಡಿ',
    'action.create': 'ರಚಿಸಿ',
    'action.search': 'ಹುಡುಕಿ',
    'action.filter': 'ಫಿಲ್ಟರ್ ಮಾಡಿ',
    'action.viewAll': 'ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ',
    'action.manage': 'ನಿರ್ವಹಿಸಿ',
    'action.logout': 'ಲಾಗ್ ಔಟ್',
    'action.send': 'ಕಳುಹಿಸಿ',
    'action.clear': 'ತೆರವುಗೊಳಿಸಿ',
    'action.retry': 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',

    // Dashboard
    'dashboard.title': 'ಹಣಕಾಸು ಆರೋಗ್ಯ ಅವಲೋಕನ',
    'dashboard.subtitle': 'ನೈಜ-ಸಮಯದ ಲೆಡ್ಜರ್ ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ನಗದು ಹರಿವು',
    'dashboard.availableBalance': 'ಲಭ್ಯವಿರುವ ಬ್ಯಾಲೆನ್ಸ್',
    'dashboard.periodIncome': 'ಅವಧಿಯ ಆದಾಯ',
    'dashboard.periodExpenses': 'ಅವಧಿಯ ವೆಚ್ಚಗಳು',
    'dashboard.netCashFlow': 'ನಿವ್ವಳ ನಗದು ಹರಿವು',
    'dashboard.budgetUtilization': 'ಮಾಸಿಕ ಬಜೆಟ್ ಬಳಕೆ',
    'dashboard.savingsProgress': 'ಉಳಿತಾಯ ಗುರಿ ಪ್ರಗತಿ',
    'dashboard.cashFlowDynamics': 'ನಗದು ಹರಿವಿನ ಡೈನಾಮಿಕ್ಸ್',
    'dashboard.categoryAllocation': 'ವರ್ಗ ಹಂಚಿಕೆ',
    'dashboard.recentTransactions': 'ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು',
    'dashboard.upcomingBills': 'ಮುಂಬರುವ ಬಿಲ್ಲುಗಳು',
    'dashboard.healthScore': 'ಹಣಕಾಸು ಆರೋಗ್ಯ ಸ್ಕೋರ್',
    'dashboard.healthScoreDesc': 'ಉಳಿತಾಯ ದರ, ಬಜೆಟ್ ಶಿಸ್ತು ಮತ್ತು ತುರ್ತು ನಿಧಿಯ ಆಧಾರದ ಮೇಲೆ ರೇಟಿಂಗ್',

    // Accounts
    'accounts.title': 'ಖಾತೆಗಳು ಮತ್ತು ವಾಲೆಟ್‌ಗಳು',
    'accounts.subtitle': 'ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು, ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್‌ಗಳು ಮತ್ತು ವಾಲೆಟ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
    'accounts.addAccount': 'ಖಾತೆ ಸೇರಿಸಿ',
    'accounts.totalAssets': 'ಒಟ್ಟು ಆಸ್ತಿಗಳು',
    'accounts.totalLiabilities': 'ಒಟ್ಟು ಹೊಣೆಗಾರಿಕೆಗಳು',
    'accounts.netWorth': 'ನಿವ್ವಳ ಖಾತೆ ಬಾಕಿ',

    // AI Assistant
    'ai.title': 'AI ಹಣಕಾಸು ಸಹಾಯಕ',
    'ai.subtitle': 'ನಿಮ್ಮ ವೆಚ್ಚಗಳು, ಬಜೆಟ್‌ಗಳು ಮತ್ತು ಉಳಿತಾಯಗಳ ಬಗ್ಗೆ ತಕ್ಷಣದ ಉತ್ತರಗಳನ್ನು ಪಡೆಯಿರಿ',
    'ai.inputPlaceholder': 'ನಿಮ್ಮ ಹಣಕಾಸಿನ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ...',
    'ai.suggestedTitle': 'ಸೂಚಿಸಲಾದ ಪ್ರಶ್ನೆಗಳು',
    'ai.clearConversation': 'ಸಂಭಾಷಣೆ ತೆರವುಗೊಳಿಸಿ',

    // Settings & Bank Connections
    'settings.title': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಮತ್ತು ಥೀಮ್‌ಗಳು',
    'settings.preferences': 'ಆದ್ಯತೆಗಳು ಮತ್ತು ಭಾಷೆ',
    'settings.language': 'ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ',
    'settings.currency': 'ಡೀಫಾಲ್ಟ್ ಕರೆನ್ಸಿ',
    'settings.themes': 'ವಿನ್ಯಾಸ ಥೀಮ್‌ಗಳು ಮತ್ತು ಬಣ್ಣಗಳು',
    'settings.bankConnections': 'ಬ್ಯಾಂಕ್ ಸಂಪರ್ಕಗಳು (ಓಪನ್ ಬ್ಯಾಂಕಿಂಗ್)',
    'settings.bankDesc': 'ನೇರ ಬ್ಯಾಂಕ್ ಸಿಂಕ್‌ಗಾಗಿ ಅಧಿಕೃತ ಖಾತೆ ಅಗ್ರಿಗೇಟರ್ ಅಗತ್ಯವಿದೆ.',
    'settings.statusNotConnected': 'ಯಾವುದೇ ಪೂರೈಕೆದಾರರು ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ',

    // Common Words
    'common.all': 'ಎಲ್ಲಾ',
    'common.income': 'ಆದಾಯ',
    'common.expense': 'ವೆಚ್ಚ',
    'common.transfer': 'ವರ್ಗಾವಣೆ',
    'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    'common.daysRemaining': 'ದಿನಗಳು ಬಾಕಿ ಇವೆ',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('finance_app_language') as LanguageCode;
    if (saved && ['en', 'ta', 'hi', 'te', 'ml', 'kn'].includes(saved)) {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('finance_app_language', lang);
    document.documentElement.setAttribute('lang', lang);
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
