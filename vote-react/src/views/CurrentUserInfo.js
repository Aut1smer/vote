
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

// module.exports = {
//     entry: __dirname + './main.js', //入口文件
//     output: {
//         dirname: '导出路径',
//         name: "bundle.[chunkhash].js" //强缓存的hash打包名
//     },
//     modules: { //配loader，将非js模块转程js模块用来引入
//         rules: [
//             {
//                 test: /.jsx$/,
//                 use: 'jsx-loader'
//             },
//             {
//                 test: /\.css$/,
//                 use: 'css-loader',
//             },
//         ]
//     },
//     plugins: [//自定义插件 用于去除打包结果中引用的重复模块，压缩混淆，将打包结果自动插入index.html
//         new webpack.ProgressPlugin(), //显示打包进度
//         new HtmlWebpackPlugin({ template: './src/index.html' }) //将打包进度插入模板文件里
//     ],
//     target: 'node', //在node环境下用；还有浏览器、electron等
// }