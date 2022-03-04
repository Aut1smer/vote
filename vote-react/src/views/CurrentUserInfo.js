
import { createContext } from "react";
import { useAxios } from "../components/hooks";

export const UserContext = createContext()

//用于请求用户信息，通过UserContext.Provider下发到下层组件里
export default function CurrentUserInfo({ children }) {
    const userInfo = useAxios({ url: '/account/current-user' }) //默认get.该hook可以被下层组件调用update，立即更新全部视图

    return (
        <UserContext.Provider value={userInfo}>
            {children}
        </UserContext.Provider>
    )
}