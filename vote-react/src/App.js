import './App.css';
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { createContext, useState } from 'react';
import Login from './views/Login'
import Register from './views/Register'
import Main from './views/Main'
import CreateVote from './views/CreateVote'
import CreateUI from './views/CreateUI';
import MyVotes from './views/MyVotes';
import ViewVote from './views/ViewVote';
import CurrentUserInfo from './views/CurrentUserInfo';
import ForgetPSWD from './views/ForgetPSWD';
import ChangePSWD from './views/ChangePSWD';
import ExpiredChangePSWD from './views/ExpiredChangePSWD';
import NotFound from './views/NotFound';

export const CurMenu = createContext()
function App() {
  const [curMenuData, updateCurMenuData] = useState(['1'])
  // const updateCurMenuData = useCallback((newKey) => {
  //   setCurMenuData(k => [newKey])
  // }, [])
  return (
    <div className="App">
      <CurrentUserInfo>
        <BrowserRouter>
          <CurMenu.Provider value={{
            selected: curMenuData,
            updateCurMenuData
          }} >
            <Routes>
              <Route path='/' element={<Main />}>
                {/* <Route path='/' element={<Navigate to='/main' />} /> */}
                {/* <Route path='/main' element={<Main />}> */}
                {/* <Route index element={<Navigate to='create' />}></Route> */}
                <Route index element={<CreateUI />}></Route>
                <Route path="create" element={<CreateUI />}></Route>
                <Route path="myvotes" element={<MyVotes />}></Route>
              </Route>
              {/* 以下为独立界面，根层级的路由 */}
              <Route path='/login' element={<Login />}></Route>
              <Route path='/register' element={<Register />}></Route>
              <Route path='/view-vote/:voteId' element={<ViewVote />}></Route>
              <Route path='/create-vote' element={<CreateVote />}></Route>
              <Route path='/forget-password' element={<ForgetPSWD />}></Route>
              <Route path='/change-password' element={<ChangePSWD />}></Route>
              <Route path='/expired-change-password' element={<ExpiredChangePSWD />}></Route>
              <Route path='*' element={<NotFound />}></Route>
            </Routes>
          </CurMenu.Provider>
        </BrowserRouter>
      </CurrentUserInfo>
    </div>
  );
}



export default App;



