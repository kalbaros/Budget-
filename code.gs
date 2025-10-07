// ====================================================================================
// File: Code.gs (Refactored for Performance and Scalability)
// Description: Implements server-side caching, pagination, and dedicated endpoints
//              for dashboard summaries and paginated transactions.
// ====================================================================================

// --- SERVICE CONFIGURATION (คงเดิม ไม่ต้องแก้ไข) ---
const SERVICE_ACCOUNT_CREDENTIALS = {
  "type": "service_account",
  "project_id": "budgetdashboard-dab7c",
  "private_key_id": "9a1024e9edf2820542af4de715f86837ccb81d4d",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCLf9IIHRPPPO25\nOWgLwpDm/G/ERCNdGEliGl57VURQhjEO+W3DdNskpuCs+vV9/JRsCMKVB90oBhFT\nq0PHfg9I+8MPK7joAEYGxwVHprrKcUGqI8MH8D+JyVMu5FK0J351Hcf8DO8YUcFJ\nOmJuly1bwAOQWGl1DC3u2yElzeh8nv5EUhC4A44XXqdqCcdsQ67wFDI729eAGOcS\nq0DYJJNXAoI9h3dXAebM30fpJvvPOMFQQjRs6Uw9zAwisfpO2Xrp9cCxutX8BMry\nUc907coJSwhDTYfIe0gQmuDnBlP02I5TCViszxB8+HBDgBSEG2YFVrP0AjfUGtX5\nKliwIgXrAgMBAAECgf8DnD7AFUc0OwvtfzDcZq3TldUV4Ivwt63EA6XuKI5ZWxGJ\nLT1FSSPMkTBA5+udk9hIBFJxpP7QdLBRc36gXBPn7trpwjh8a5dUrR4vCza/Kmwj\nLQXva8PexQFZWKb2qDdfyF0gEL4Jt41qJd6RRkipIwGDXluGNhINUiD2DyR0dluF\nSVjmL80LuUKTqTrF/oIKqMcPvUYEbUcJg2ZESnDvPWfymslbhrUm+9nHcnGoAoWh\nT1hFpoxYAQ/h39Yy4RsPHYUE5PbQ9XPm13R15W1RKMezm1kgU7Y3YP53hYXrHJMd\nr8L5SBUvK5pWNikJGfW/KeaGJXyH5NTIPzzbqA0CgYEAxRUur7Fa2VhHkXDtq7sm\nzeQzxwABKt/ebBJHYdZNsNtfogqwTAB+hUGjFIaIdQHnKTWw+eqcBGA9ntp+ME/d\n4tG9CqP98WPgX9habr7EOjIbwGUb6v3qXYihCyN3tXcQ0cP+BpYPckZRGYhA+cJQ\nEaLHND6PghNOHVIVYafrZFUCgYEAtTPBSYzcrfZRsO5dxbG3yOcfq0xumg0ie9sK\nCduFU2ObeEzTcxURi7/Twxq0JEW5tpkmbtgMXN6iplokpEituP3xOSMcYzXXv25e\n3bzRM/OFjYvWrnbx7lQh73csS2IRargcYCTfne0Uav1N6Xh6s5JwdLv0jExusW0J\nMfqQAT8CgYBF3DdbYhPhHVDpNk2ZZVLhAvZzoQXI6+hNCMGy5aNOgMTKjN1nY3l1\nxQmI2hN+3njRe83LGSXKy06sg6jdeUIfB9fp8K2wpoW/k9KilQ67zk1WCsE1sGIm\nW6syZpUlhxo4MTBXp1O8Xz6aPVlC72UwizHvzAlUw4EaFaGspzhirQKBgFNZpTVx\n6CjVPyqF2viPER0Gw5iGJfISzKPwU6PJKID9NoyVukYbkOCZsozygZ6VvCF0PSuL\nkdQ+TM78dBJlpBOOLCG+Ntaj88QIvvZ8Xjbpc6tygaPq7spURO/j/6oFSEGwwsyu\n6XW5kkTMk8QrOTXUzInF022d0uUmZK5qtUb9AoGBAImA5zPGgi5b0hv1xwYluQBU\n5HmWJmxEy6OL7B7T6t8DlkKv2RMsu9tKcEYFg/6F/k2kkb/UL8CVZPUWvfhw3mwc\nz6Rq5Yj6C57h+DXHJxKncfUFUEfzVqblD/3teqnMqTnNZQSQOSmxW/6emmLPQvC0\nYYDVZ6S0O+nkBmJeUt08\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@budgetdashboard-dab7c.iam.gserviceaccount.com",
};
const PROJECT_ID = SERVICE_ACCOUNT_CREDENTIALS.project_id;
const PRIVATE_KEY = SERVICE_ACCOUNT_CREDENTIALS.private_key;
const CLIENT_EMAIL = SERVICE_ACCOUNT_CREDENTIALS.client_email;
const COLLECTION_NAME = 'transactions';

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบบริหารงบประมาณ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getFirestoreAccessToken() {
  const cache = CacheService.getScriptCache();
  const cachedToken = cache.get('firestore_access_token');
  if (cachedToken != null) {
    return cachedToken;
  }

  const jwt = createJwt();
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const options = {
    'method': 'post',
    'payload': {
      'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion': jwt
    }
  };
  const response = UrlFetchApp.fetch(tokenUrl, options);
  const token = JSON.parse(response.getContentText()).access_token;
  cache.put('firestore_access_token', token, 3500);
  return token;
}

function createJwt() {
  const header = { "alg": "RS256", "typ": "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = { "iss": CLIENT_EMAIL, "scope": "https://www.googleapis.com/auth/datastore", "aud": "https://oauth2.googleapis.com/token", "exp": now + 3600, "iat": now };
  const toSign = Utilities.base64EncodeWebSafe(JSON.stringify(header)) + '.' + Utilities.base64EncodeWebSafe(JSON.stringify(claimSet));
  const signature = Utilities.computeRsaSha256Signature(toSign, PRIVATE_KEY);
  return toSign + '.' + Utilities.base64EncodeWebSafe(signature);
}

const FIRESTORE_API_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
function getRequestHeaders() { return { 'Authorization': 'Bearer ' + getFirestoreAccessToken(), 'Content-Type': 'application/json' }; }

// ====================================================================================
// NEW & REFACTORED FUNCTIONS START HERE
// ====================================================================================

function clearAllCaches_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['dashboard_summary', 'all_transactions', 'unique_items']);
    Logger.log("All performance caches cleared.");
  } catch(e) {
    Logger.log("Error clearing caches: " + e.toString());
  }
}

function getDashboardSummary() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'dashboard_summary';
  const cached = cache.get(cacheKey);
  if (cached != null) {
    Logger.log("Dashboard Summary: Returned from CACHE.");
    return JSON.parse(cached);
  }

  Logger.log("Dashboard Summary: Fetching from Firestore.");
  const allTransactions = getAllTransactions_();
  if (allTransactions.error) return allTransactions;

  const totalIncome = allTransactions.reduce((sum, t) => sum + (t.income || 0), 0);
  const totalExpense = allTransactions.reduce((sum, t) => sum + (t.expense || 0), 0);
  const latestDate = allTransactions.length > 0 ? allTransactions.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date : null;

  const monthlyData = {};
  const today = new Date();
  const labels = Array.from({length: 12}, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
  });
  
  labels.forEach(key => {
    monthlyData[key] = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
  });

  allTransactions.forEach(t => {
      const date = new Date(t.date);
      if(!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
        if (monthlyData[monthKey]) {
            monthlyData[monthKey].income += t.income;
            monthlyData[monthKey].expense += t.expense;
            if(t.income > 0) monthlyData[monthKey].incomeCount++;
            if(t.expense > 0) monthlyData[monthKey].expenseCount++;
        }
      }
  });

  const summary = {
    totalIncome, totalExpense, totalBalance: totalIncome - totalExpense, latestDate,
    chartData: {
      labels,
      incomeValues: labels.map(m => monthlyData[m]?.income || 0),
      expenseValues: labels.map(m => monthlyData[m]?.expense || 0),
      incomeCountValues: labels.map(m => monthlyData[m]?.incomeCount || 0),
      expenseCountValues: labels.map(m => monthlyData[m]?.expenseCount || 0),
    }
  };
  
  cache.put(cacheKey, JSON.stringify(summary), 600); // Cache for 10 minutes
  return summary;
}

function getTransactions(options) {
  const { page = 1, itemsPerPage = 100, sortBy = 'date', sortOrder = 'desc', searchTerm = '' } = options;
  try {
    let transactions = getAllTransactions_();
    if (transactions.error) return transactions;

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      transactions = transactions.filter(t =>
        (t.item || '').toLowerCase().includes(lowercasedTerm) || (t.details || '').toLowerCase().includes(lowercasedTerm)
      );
    }
    
    transactions.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'date') {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      }
      if (typeof valA === 'string') return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const totalItems = transactions.length;
    const startIndex = (page - 1) * itemsPerPage;
    const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);
    return { transactions: paginatedTransactions, totalItems: totalItems };
  } catch (e) {
    Logger.log(e);
    return { error: e.toString() };
  }
}

function getUniqueItems() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'unique_items';
  const cached = cache.get(cacheKey);
  if (cached != null) {
    Logger.log("Unique Items: Returned from CACHE.");
    return JSON.parse(cached);
  }
  
  const allTransactions = getAllTransactions_();
  if (allTransactions.error) return allTransactions;
  
  const uniqueItems = [...new Set(allTransactions.map(t => t.item))].sort();
  cache.put(cacheKey, JSON.stringify(uniqueItems), 600); // Cache for 10 minutes
  return uniqueItems;
}

function getTransactionsByItems(items) {
  if (!items || items.length === 0) return [];
  const allTransactions = getAllTransactions_();
  if (allTransactions.error) return allTransactions;

  return allTransactions
    .filter(t => items.includes(t.item))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getAllTransactions_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'all_transactions';
  const cached = cache.get(cacheKey);
  if(cached != null) {
    Logger.log("ALL TRANSACTIONS from helper: Returned from CACHE.");
    return JSON.parse(cached);
  }
  
  Logger.log("ALL TRANSACTIONS from helper: Fetching from Firestore.");
  try {
    let allDocuments = [];
    let pageToken = '';
    const baseUrl = `${FIRESTORE_API_URL}/${COLLECTION_NAME}`;
    do {
      const url = pageToken ? `${baseUrl}?pageSize=300&pageToken=${pageToken}` : `${baseUrl}?pageSize=300`;
      const response = UrlFetchApp.fetch(url, { 'method': 'get', 'headers': getRequestHeaders(), 'muteHttpExceptions': true });
      const data = JSON.parse(response.getContentText());
      if (data.documents) allDocuments = allDocuments.concat(data.documents);
      pageToken = data.nextPageToken;
    } while (pageToken);

    const transactions = allDocuments.map(doc => {
      const pathParts = doc.name.split('/');
      const fields = doc.fields || {};
      let transactionDate = '';
      if (fields.date) {
        if (fields.date.timestampValue) transactionDate = new Date(fields.date.timestampValue).toISOString().split('T')[0];
        else if (fields.date.stringValue) transactionDate = fields.date.stringValue;
      }
      return {
        id: pathParts[pathParts.length - 1], date: transactionDate,
        item: fields.item ? fields.item.stringValue : 'N/A',
        details: fields.details ? fields.details.stringValue : '',
        income: fields.income ? parseFloat(fields.income.doubleValue || fields.income.integerValue || 0) : 0,
        expense: fields.expense ? parseFloat(fields.expense.doubleValue || fields.expense.integerValue || 0) : 0
      };
    });
    cache.put(cacheKey, JSON.stringify(transactions), 600); // Cache all data for 10 mins
    return transactions;
  } catch (e) {
    Logger.log(e);
    return { error: e.toString() };
  }
}

// --- CUD OPERATIONS (with Cache Clearing) ---

function addTransaction(data) {
  clearAllCaches_();
  try {
    const url = `${FIRESTORE_API_URL}/${COLLECTION_NAME}`;
    const payload = { fields: { date: { stringValue: data.date }, item: { stringValue: data.item }, details: { stringValue: data.details }, income: { doubleValue: parseFloat(data.income) }, expense: { doubleValue: parseFloat(data.expense) } } };
    const response = UrlFetchApp.fetch(url, { 'method': 'post', 'headers': getRequestHeaders(), 'payload': JSON.stringify(payload) });
    return { success: true, data: response.getContentText() };
  } catch (e) { Logger.log(e); return { error: e.toString() }; }
}

function updateTransaction(id, data) {
  clearAllCaches_();
  try {
    const url = `${FIRESTORE_API_URL}/${COLLECTION_NAME}/${id}?${['date', 'item', 'details', 'income', 'expense'].map(f => `updateMask.fieldPaths=${f}`).join('&')}`;
    const payload = { fields: { date: { stringValue: data.date }, item: { stringValue: data.item }, details: { stringValue: data.details }, income: { doubleValue: parseFloat(data.income) }, expense: { doubleValue: parseFloat(data.expense) } } };
    const response = UrlFetchApp.fetch(url, { 'method': 'patch', 'headers': getRequestHeaders(), 'payload': JSON.stringify(payload), 'muteHttpExceptions': true });
    return { success: true, data: response.getContentText() };
  } catch (e) { Logger.log(e); return { error: e.toString() }; }
}

function deleteTransaction(id) {
  clearAllCaches_();
  try {
    UrlFetchApp.fetch(`${FIRESTORE_API_URL}/${COLLECTION_NAME}/${id}`, { 'method': 'delete', 'headers': getRequestHeaders() });
    return { success: true, id: id };
  } catch (e) { Logger.log(e); return { error: e.toString() }; }
}

function addTransactionsBatch(dataArray) {
  clearAllCaches_();
  // ... (โค้ดส่วนที่เหลือเหมือนเดิม) ...
  try {
    if (!dataArray || dataArray.length === 0) return { success: true, message: 'Empty batch provided.' };
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
    const writes = dataArray.map(record => {
      const income = Number(String(record.income || '0').replace(/,/g, ''));
      const expense = Number(String(record.expense || '0').replace(/,/g, ''));
      if (isNaN(income) || isNaN(expense)) return null;
      return { update: { name: `${baseUrl}/${COLLECTION_NAME}/${Utilities.getUuid()}`, fields: { date: { stringValue: String(record.date) }, item: { stringValue: String(record.item) }, details: { stringValue: String(record.details) }, income: { doubleValue: income }, expense: { doubleValue: expense } } }, currentDocument: { exists: false } };
    }).filter(w => w !== null);
    if (writes.length === 0) return { success: true, message: 'No valid data to write after cleaning.' };
    const response = UrlFetchApp.fetch(`${baseUrl}:commit`, { 'method': 'post', 'headers': getRequestHeaders(), 'payload': JSON.stringify({ writes }), 'muteHttpExceptions': true });
    return { success: true, data: response.getContentText() };
  } catch (e) { Logger.log(e); return { error: e.toString() }; }
}

function deleteAllTransactions() {
  clearAllCaches_();
  // ... (โค้ดส่วนที่เหลือเหมือนเดิม) ...
  try {
    const allDocs = getAllTransactions_(); // Will fetch from Firestore as cache is now clear
    if (allDocs.error || allDocs.length === 0) return { success: true, message: 'No documents to delete.' };
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
    const chunkSize = 400;
    for (let i = 0; i < allDocs.length; i += chunkSize) {
        const docChunk = allDocs.slice(i, i + chunkSize);
        const writes = docChunk.map(doc => ({ delete: `${baseUrl}/${COLLECTION_NAME}/${doc.id}` }));
        UrlFetchApp.fetch(`${baseUrl}:commit`, { 'method': 'post', 'headers': getRequestHeaders(), 'payload': JSON.stringify({ writes }), 'muteHttpExceptions': true });
    }
    clearAllCaches_(); // Clear again after mass delete
    return { success: true };
  } catch (e) { Logger.log(e); return { error: e.toString() }; }
}
