import * as mockApi from "./mockApi"
import * as realApi from "./realApi"

export const api = process.env.REACT_APP_USE_MOCK_API === "true" ? mockApi : realApi
