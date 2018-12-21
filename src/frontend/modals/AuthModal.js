import React, { useState, useEffect } from 'react';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField';


function AuthModal({ open , setOpen, login }){
  const [ auth, setAuth ] = useState({name: '', pwd: '', rePwd: ''});
  const [ reg, setReg ] = useState(false);
  const [ err, setErr ] = useState(null);
  const [ success, setSuccess ] = useState(false)
  const containerStyle = {
    position: 'absolute',
    width: '50%',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }

  const modalStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    backgroundColor: '#fff'
  }

  const errStyle = {
    backgroundColor: 'red',
    color: '#fff',
    transform: 'scaleY(1)',
  }

  const successStyle = {
    backgroundColor: 'green',
    color: '#fff',
    transform: 'scaleY(1)',
  }

  const messageStyle = {
    width: '100%',
    height: '2em',
    transform: 'scaleY(0)',
    transition: 'transform .5s',
    transformOrigin: 'bottom',
    textAlign: 'center',
  }

  const handleLogin = async () => {
    try{
      const res = await fetch('http://localhost:3000/login', {
          method: "POST",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({name: auth.name, pwd: auth.pwd})
        });
      const json = await res.json();
      if(json.hasOwnProperty('name')){
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
        }, 500)
        login(auth.name, auth.pwd)
      }else{
        setErr(json.err);
      }
    }catch(e){
      setErr(e);
    }
  }

  const handleRegister = async () => {
    if(auth.pwd !== auth.rePwd){
      setErr('passwords do not match')
    }
    try{
      const res = await fetch('http://localhost:3000/register', {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({name: auth.name, pwd: auth.pwd})
      });
      const json = await res.json();
      if(json.hasOwnProperty('name')){
        setSuccess(true)
        login(auth.name, auth.pwd)
      }else{
        setErr(json.err);
      }
    }catch(e){
      setErr(e);
    }
  }

  useEffect(() => {
    if(!open){
      setErr(null);
    }
  },[open])


  return(
    <Modal
          aria-labelledby="log into account"
          aria-describedby="log in or register popup"
          open={open}
          onClose={setOpen}
        >
        <div style = {containerStyle}>
          {
          <div style = {err?{...messageStyle, ...errStyle}:success?{...messageStyle, ...successStyle}:messageStyle}>
            {err?err:null}
            {success?'You have successfully logged in!':null}
          </div>
          }
          <div style={modalStyle} >
            <button onClick = {() => setOpen()}> x </button>
            <TextField
              id="user-name-input"
              label="UserName"
              margin="normal"
              variant="outlined"
              value = {auth.name}
              onChange = {(e) => setAuth({...auth, name:e.target.value})}
            />
            <TextField
              id="password-input"
              label="Password"
              type="password"
              margin="normal"
              variant="outlined"
              value = {auth.pwd}
              onChange = {(e) => setAuth({...auth, pwd:e.target.value})}
            />
            {reg && <TextField
              id="re-password-input"
              label="Re-Password"
              type="password"
              margin="normal"
              variant="outlined"
              value = {auth.rePwd}
              onChange = {(e) => setAuth({...auth, rePwd:e.target.value})}
              />
            }
            <Button onClick = {reg?handleRegister:handleLogin}>{reg?'Create Account': 'Log In'}</Button>
            <button onClick = {() => setReg(!reg)}>{reg?'Already have account?': "Don't have account?"}</button>
          </div>
          </div>
    </Modal>
  )
}

export default AuthModal;
