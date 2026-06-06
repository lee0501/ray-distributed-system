import * as mockApi from "./mockApi"
import * as realApi from "./realApi"

export const api = process.env.REACT_APP_USE_MOCK_API === "false" ? mockApi : realApi
// 先用mock-api這個去讀.env.development的內容看是true or false
// 在用三元判斷的方法去做 所以true選mockApi,反之 false再去選realApi
// export就是匯出選好的那包API這樣前端那邊的import就可以拿到
