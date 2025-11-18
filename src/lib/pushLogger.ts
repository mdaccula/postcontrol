// 🔍 FASE 5: Logger centralizado para Push Notifications

export const pushLogger = {
  group: (title: string) => {
    console.group(`🔔 [Push] ${title}`);
  },
  
  info: (msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`✅ [${timestamp}] ${msg}`, data !== undefined ? data : '');
  },
  
  warn: (msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`⚠️ [${timestamp}] ${msg}`, data !== undefined ? data : '');
  },
  
  error: (msg: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`❌ [${timestamp}] ${msg}`, error || '');
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }
  },
  
  groupEnd: () => {
    console.groupEnd();
  },

  table: (data: any) => {
    console.table(data);
  }
};
