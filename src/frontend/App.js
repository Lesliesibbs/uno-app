import React, { useContext, useState, useEffect } from 'react';
import { TweenLite, TimelineLite, TimelineMax } from 'gsap';
import gameStoreContext from './context/gameStoreContext';
import authStoreContext from './context/authStoreContext';
import useScale from './utils/useScale';
import BuildPlayers from './utils/BuildPlayers'
import FindInitTransform from './utils/FindInitTransform';
import InitialState from './utils/InitialState';
import ApiEndpoint from './utils/ApiEndpoint';
import Button from '@material-ui/core/Button';
import Player from './Player';
import CardInPlay from './CardInPlay';
import Hand from './Hand'
import HandCard from './HandCard';
import Card from './Card'
import DrawCard from './DrawCard';
import io from 'socket.io-client';
import history from './utils/history';

function App() {
  const [ login, setLogin ] = useContext(authStoreContext);
  const [ myId, setMyId ] = useState(null);
  const [ isHost, setIsHost ] = useState(false);
  const [ turnId, setTurnId ] = useState(null);
  const [ lastTurnId, setLastTurnId ] = useState(null);
  const [ newCard, setNewCard ] = useState({value: null, color: ''});
  const [ middleCard, setMiddleCard ] = useState({});
  const [ players, setPlayers ] = useState([]);
  const [ shiftedPlayers, setShiftedPlayers ] = useState([]);
  const [ hand, setHand ] = useState([]);
  const [ playerStatus, setPlayerStatus ] = useState({isAnimating: false, isDrawing: false, id: null})
  const [ hasEnded, setHasEnded] = useState(false);
  const [ wonName, setWonName ] = useState(null);

  const scaleFactor = useScale();
  const first = null;
  const location = history.location.pathname.split('/');
  const gameId = location[location.length - 1];
  let socket;

  const tl = new TimelineMax;

  const middleStyle = {
    display: 'flex',
    justifyContent: 'space-evenly',
    position: 'absolute',
    left: `calc(50%)`,
    top: `calc(50%)`,
    width: '10em',
    transform: `translate(-50%, -50%) ${`scale(${scaleFactor.size + .2})`}`
  }

  const buttonStyle = {
    position: 'absolute',
    top: '1em',
    left: '1em',
    zIndex: '100'
  }

  const endedStyle = {
    display: 'flex',
    justifyContent: 'center',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: `translate(-50%, -50%)`,
    width: '50%',
    height: '50%',
    backgroundColor: '#fff',
    color: '#000',
    fontSize: '2em'
  }

  //functions

  async function leave(e){
      try{
        if(isHost){
          const endReq = new ApiEndpoint(`/api/game/${gameId}/end/${myId}`);
          const endData = await endReq.postReq();
        }else{
          const leaveReq = new ApiEndpoint(`/api/game/${gameId}/leave/${myId}`);
          const leaveData = await leaveReq.postReq()
        }
      }catch(e){
        console.log(e);
      }

  }

  async function submitCard({ cId, color, hasDrawn }){
    try{
      const submitEnd = new ApiEndpoint(`/api/game/${gameId}/submitCard/${myId}`);
      const data = await submitEnd.postReq({cId: cId, color: color, hasDrawn: hasDrawn});
      const handData = await new ApiEndpoint(`/api/getHand/${myId}`).getReq();
      setHand(handData.hand);
    }catch(e){
      console.log(e);
    }
  }

  async function drawCard(){
    try{
      const drawData = await new ApiEndpoint(`/api/game/${gameId}/drawCard/${myId}`).getReq();
      const handData = await new ApiEndpoint(`/api/getHand/${myId}`).getReq();

      setPlayerStatus({id: myId, isAnimating: false, isDrawing: true})
      tl
      .to('#draw-card', .5, {
        onComplete: () => {
          setHand(handData.hand)
          setPlayerStatus({id: null, isAnimating: false, isDrawing: false})
        }
      })

      return drawData.card;
    }catch(e){
      console.log(e);
    }
  }

  async function cardsGiven({playerId, myId}){
    if(playerId === myId){
      try{
        const handData = await new ApiEndpoint(`/api/getHand/${myId}`).getReq();
        setHand(handData.hand);
      }catch(e){
        console.log(e);
      }
    }else{
      setPlayerStatus({id: playerId, isAnimating: false, isDrawing: false})
      tl.to(`player-${playerId}-card-0`, .5, {
        onComplete: () => {
          setPlayerStatus({id: null, isAnimating: false, isDrawing: false});
        }
      })
    }
  }

  async function initializeGame(){
    let mId;
      try{
        const gameData = await new ApiEndpoint(`/api/game/${gameId}`).getReq();
        const playersData = await new ApiEndpoint(`/api/getPlayersWithCount/${gameId}`).getReq();
        const myI = playersData.players.findIndex((player) => player.user_name === login.user_name);
        mId = playersData.players[myI].id;
        const handData = await new ApiEndpoint(`/api/getHand/${mId}`).getReq();
        const cIPData = await new ApiEndpoint(`/api/getCardInPlay/${gameId}`).getReq();
        const shift = BuildPlayers({
          players: playersData.players,
          username: login.user_name,
          scaleFactor: scaleFactor
        });
        setPlayers(playersData.players);
        setShiftedPlayers(shift);
        setIsHost(playersData.players[myI].is_host);
        setMyId(mId);
        setTurnId(gameData.game.turn_id);
        setLastTurnId((myI -1 < 0)?playersData.players[playersData.players.length -1].id:mId);
        setHand(handData.hand);
        setMiddleCard(cIPData.card)
      }catch(e){
        console.log(e);
      }
  }

  //lifecycle hooks

  //cdm
  useEffect(() => {
      initializeGame();
  },[first])

  useEffect(() => {
    if(myId !== null){
        socket = io('/game',{transports: ['websocket'], upgrade: false});
        socket.emit('join', {gameId: gameId});
        //socket events
        socket.on('newTurn', async (data) => {
          try{
            if(data.newCards.status){
              await cardsGiven({playerId:data.newCards.id, myId: myId});
            }
            if(data.currTurn === myId){
              const handData = await new ApiEndpoint(`/api/getHand/${myId}`).getReq();
              setTurnId(data.currTurn);
              setLastTurnId(data.lastTurn);
              setNewCard((data.card.id === middleCard.id)?{id:-1}: data.card);
              setHand(handData.hand)
            }else{
              if(data.hasDrawn){
                setPlayerStatus({id: data.lastTurn, isAnimating: false, isDrawing: true})
              }
              setTurnId(data.currTurn);
              setLastTurnId(data.lastTurn);
              setNewCard((data.card.id === middleCard.id)?{id:-1}: data.card);
            }
          }catch(e){
            console.log(e);
          }
        });

        socket.on('playerLeft', async (data) => {
          try{
            const playersData = await new ApiEndpoint(`/api/getPlayersWithCount/${gameId}`).getReq();
            setPlayers(playersData.players);
            setShiftedPlayers(BuildPlayers({
              players: playersData.players,
              username: login.user_name,
              scaleFactor: scaleFactor
            }))
          }catch(e){
            console.log(e);
          }
        });

        socket.on('end', (data) => {
          setHasEnded(true);
        });

        socket.on('playerWon', async (data) => {
          try{
            setWonName(data.user_name)
          }catch(e){
            console.log(e);
          }
        });
    }
  },[myId])

  //re-render players when scaleFactor changes
  useEffect(() => {
    const shift = BuildPlayers({
      players: players,
      username: login.user_name,
      scaleFactor: scaleFactor
    })
    setShiftedPlayers(shift);
  },[scaleFactor])

  //animate player's new card to middle
  useEffect(() => {
    if(newCard.id !== -1 && lastTurnId !== myId){
      let source = document.getElementById('new');
      let target = document.getElementById(`player-${lastTurnId}-card-0`);
      const lastI = players.findIndex(player => player.id === lastTurnId);
      const initTransform = FindInitTransform(target, players[lastI].rotate, scaleFactor.size);
      // animate
      target = document.getElementById('card-in-play')
      const bBox = target.getBoundingClientRect();
      const variance = Math.random() * (5 - (-5)) + (-5);

      tl
      .set(source, {x: initTransform.x, y: initTransform.y, rotation: initTransform.rotate, scale: scaleFactor.size,
        onComplete: () => {
          setPlayerStatus({id: lastTurnId, isAnimating: true, isDrawing: false});
        }
      })
      .to(source, .25, {opacity: 1}, '+=.25')
      .to(source, .5, {x: bBox.x, y: bBox.y, rotation: variance, scale: scaleFactor.size + .2,
        onComplete: () => {
          setMiddleCard({...newCard, variance: variance})
          setPlayerStatus({id: null, isAnimating: false, isDrawing: false})
        }
      })
      .set(source, {opacity: 0})
    }else if(newCard.id !== -1 && lastTurnId === myId){
      setMiddleCard(newCard);
    }else if(newCard.id === -1){
      setPlayerStatus({id: lastTurnId, isAnimating: false, isDrawing: true});
      tl.to('#new', .5, {onComplete: () => setPlayerStatus({id: null, isAnimating: false, isDrawing: false})});
    }

  }, [newCard]);

  useEffect( () => {
    if(myId !== null){
      window.addEventListener('beforeunload', leave)
    }
    return(() => {
      window.removeEventListener('beforeunload', leave)
    })
  }, [myId])

  useEffect(() => {
    if(hasEnded){
      setTimeout(() => {
        history.push('/gamesList');
      }, 2000)
    }
  }, [hasEnded])

  useEffect(() => {
    if(wonName !== null){
      setTimeout(() => {
        leave();
        history.push('/gamesList');
      }, 2000)
    }
  }, [wonName])


  return (

      <div>
        <Button style = {buttonStyle} onClick = {leave} variant = "outlined" color = "secondary"> Quit </Button>
        {
          shiftedPlayers.map((player) =>
            <Player
              key = {`player-${player.id}`}
              tl = {tl}
              uName = {player.user_name}
              pId = {player.id}
              turnId = {turnId}
              playerStatus = {playerStatus}
              translate = {player.translate}
              rotate = {player.rotate}
              scale = {scaleFactor.size}
            />
          )
        }

        <div style = {middleStyle}>
          <DrawCard
            tl = {tl}
            playerStatus = {playerStatus}
            myId = {myId}
            scaleFactor = {scaleFactor.size + .2}
            isMyTurn = {(turnId === myId)? true: false}
          />
          <CardInPlay card = {middleCard}/>
        </div>

        <Hand
          tl = {tl}
          myId = {myId}
          hand = {hand}
          isMyTurn = {(turnId === myId)? true: false}
          lastTurnId = {lastTurnId}
          scaleFactor = {scaleFactor.size}
          submitCard = {submitCard}
          drawCard = {drawCard}
          isAnimating = {playerStatus.isAnimating}
        />


        <HandCard
          cId = 'new'
          value = {newCard.value}
          color = {newCard.color}
          style = {{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: 'top left',
            opacity: 0
          }}
        />

        {
          hasEnded?
          <div style = {endedStyle}>
            Host has Ended Game
          </div>
          :null
        }

        {
          wonName?
          <div style = {endedStyle}>
            Player {wonName} has won the game!
          </div>
          :null
        }
      </div>
  );
}

export default App;
