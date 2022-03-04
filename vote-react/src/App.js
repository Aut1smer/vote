import './App.css';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import Login from './views/Login'
import Register from './views/Register'
import Main from './views/Main'
import CreateVote from './views/CreateVote'
import CreateUI from './views/CreateUI';
import MyVotes from './views/MyVotes';
import ViewVote from './views/ViewVote';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import CurrentUserInfo from './views/CurrentUserInfo'



function App() {

  return (
    <div className="App">
      <CurrentUserInfo>
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<Navigate to='/main' />} />
            <Route path='/main' element={<Main />}>
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
            <Route path='/list' element={<MyList data={data} />}></Route>
          </Routes>
        </BrowserRouter>
      </CurrentUserInfo>
    </div>
  );
}


//题目一
var data = [{
  name: 'text',
  age: 20,
}, {
  name: 'bbb',
  age: 22,
}, {
  name: 'ccc',
  age: 18,
}, {
  name: 'ddd',
  age: 22,
}]


function MyList(props) {
  const data = props.data
  const ref = useRef({ curLi: null })
  const [curIdx, setCurIdx] = useState(-1)
  const selectOne = useCallback((e, idx) => {
    ref.current.curLi = e.target
    console.log('ref is', ref);
    setCurIdx(i => idx)
  }, [])
  return (
    <ul>
      {
        data.map((option, idx) => {
          return (
            <li className={curIdx == idx ? 'sss' : ''} onClick={e => selectOne(e, idx)} key={idx}>
              name: {option.name}
              age: {option.age}
            </li>
          )
        })
      }
    </ul>
  )
};


//题目二
function resourceProcess(ary) {
  const re = /\/\/[^\s]+/
  return ary.map(resource => 'https:' + re.exec(resource))
}

//题目三
class EventEmitter {
  constructor() {
    this._listener = {} // 事件：[...事件处理函数]
  }
  //绑定
  on(eventName, eventHandler) {
    if (!this._listener[eventName]) {
      this._listener[eventName] = []
    }
    this._listener.push(eventHandler)
  }
  //解绑
  off(eventName) {
    if (!this.
      _listener[eventName]) {
      return
    }
    this._listener[eventName] = []
  }

  //触发
  trigger(eventName, data) {
    if (!this._listener[eventName]) return
    this._listener[eventName].forEach(f => f(data))
  }
}

export default App;



