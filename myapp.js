// myapp.js
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(server);

const cors = require('cors');
const mysql = require('mysql2');
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

const users={};

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'madcamp4',
    database: 'madcamp4'
  });
  
connection.connect((err) => {
    if (err) {
    console.error('MySQL 연결 실패:', err);
    throw err;
    }
    console.log('MySQL 연결 성공!');
});


// WebSocket 연결을 처리하는 부분
io.on('connection', (socket) => {
  console.log('WebSocket connection established');

  socket.on('setUser', (userId) => {
    users[userId] = socket.id;
    console.log('setUser',userId)
  
    const query1 = "SELECT chatroom_id FROM chatjoins WHERE user_id='"+userId+"'";
    const query2 = "SELECT locationroom_id FROM locationjoins WHERE user_id='"+userId+"'";

    connection.query(query1, (err,results) => {
      if (err) throw err;
      else {
        for(const result of results){
          socket.join(result.chatroom_id);
          console.log('Join',userId,result.chatroom_id);
        }
      }
    });

    connection.query(query2, (err,results) => {
      if (err) throw err;
      else {
        for(const result of results){
          socket.join(result.locationroom_id);
          console.log('Join',userId,result.locationroom_id);
        }
      }
    });
    console.log('Set user',userId,socket.id);
  });

  socket.on('invitation', (data) => {
    const invitedId= data.invitedId;
    const roomId= data.roomId;
    const roomName= data.roomName;
    invitedSocket = users[invitedId];
    if(invitedSocket!==undefined){
      io.to(invitedSocket).emit('joinRoom', ({ roomname:roomName,room_id:roomId,last_time:'',last_message:'' }));
    }
    //io.to(roomId).emit('joinRoom', ({ roomname:roomName,room_id:roomId }));
    const query1 = "INSERT INTO chatjoins VALUES('"+roomId+"', '"+invitedId+"', 0)";
    connection.query(query1, (err) => {
      if (err) throw err;
    });
    const query2 = "UPDATE rooms SET members_num=members_num+1 WHERE chatroom_id='"+roomId+"'";
    connection.query(query2, (err) => {
      if (err) throw err;
    });
    console.log('Invite:', invitedId,roomId);
  });

  socket.on('joinRoom', (data) => {
    const userId= data.userId;
    const roomId= data.roomId;
    /*const query = "INSERT INTO chatjoins VALUES('"+roomId+"', '"+invitedId+"', 0)";
    connection.query(query, (err) => {
      if (err) throw err;
    });*/
    socket.join(roomId);
    console.log('Join', userId, roomId);
  });

  socket.on('createRoom', (data) => {
    const userId= data.userId;
    const chatroomId= data.chatroomId;
    const locationroomId= data.locationroomId;
    const roomName= data.roomName;

    const query1 = "INSERT INTO rooms VALUES('"+chatroomId+"', '"+locationroomId+"', '"+roomName+"', 1, '', NOW())";
    connection.query(query1, (err) => {
      if (err) throw err;
    });
    const query2 = "INSERT INTO chatjoins VALUES('"+chatroomId+"', '"+userId+"', 0)";
    connection.query(query2, (err) => {
      if (err) throw err;
    });
    socket.join(chatroomId);
    socket.emit('joinRoom', ({ roomname:roomName,room_id:chatroomId,last_time:'',last_message:''}));
    console.log('Create', userId, roomName);
  });

  socket.on('leaveRoom', (data) => {
    const userId= data.userId;
    const roomId= data.roomId;

    const query1 = "DELETE FROM chatjoins WHERE chatroom_id = '"+roomId+"' AND user_id ='"+userId+"'";
    connection.query(query1, (err) => {
      if (err) throw err;
    });
    const query2 = "UPDATE rooms SET members_num=members_num-1 WHERE chatroom_id='"+roomId+"'";
    connection.query(query2, (err) => {
      if (err) throw err;
    });
    socket.leave(roomId);
    console.log('Leave', userId, roomId);
  });

  // WebSocket 메시지 수신
  socket.on('message', (data) => {
    const userId= data.userId;
    const roomId= data.roomId;
    const content= data.content;
    const category= data.category;
    let sendtime = '';

    const query1 = "INSERT INTO chats(chatroom_id, sender_id, contents, category, send_time) VALUES('"+roomId+"', '"+userId+"', '"+content+"','"+category+"', NOW())";
    connection.query(query1, (err) => {
      if (err) throw err;
    });
    const query2 = "UPDATE chatjoins SET checked=checked+1 WHERE chatroom_id='"+roomId+"' AND user_id!='"+userId+"'";
    connection.query(query2, (err) => {
      if (err) throw err;
    });

    last_message = content;
    if(category=="image") last_message="이미지";
    const query3 = "UPDATE rooms SET last_time=NOW(),last_message='"+last_message+"' WHERE chatroom_id='"+roomId+"'";
    connection.query(query3, (err) => {
      if (err) throw err;
    });

    /*const query = "SELECT send_time FROM chats WHERE chatroom_id='"+roomId+"' AND sender_id='"+userId+"' AND contents='"+content+"' AND category='"+category+"' ORDER BY send_time DESC LIMIT 1";
    connection.query(query, (err,results) => {
      if (err) throw err;
      else{
        results.forEach((result) => {
          sendtime = result.send_time;
        }); 
      }
    });*/

    const query4 = "SELECT nickname FROM users WHERE user_id='"+userId+"' LIMIT 1";
    connection.query(query4, (err,results) => {
      if (err) throw err;
      else{
        results.forEach((result) => {
          io.to(roomId).emit('receivemessage', ({ chatroom_id:roomId, sender_id:userId, contents:content, category:category, nickname:result.nickname}));
          io.to(roomId).emit('receivemessagee', ({ chatroom_id:roomId, sender_id:userId, contents:content, category:category, nickname:result.nickname}));
        }); 
      }
    });
    //socket.emit('receivemessage', ({ chatroom_id:roomId, sender_id:userId, contents:content, category:category}));
    //io.to(roomId).emit('receivemessage', ({ chatroom_id:roomId, sender_id:userId, contents:content, category:category}));
    console.log('message sended:', roomId, content);
  });

  /*socket.on('checkMessage', (roomId,userId) => {
    const query = "UPDATE chatjoins SET checked=0 WHERE chatroom_id='"+roomId+"' AND user_id='"+userId+"'";
    connection.query(query, (err) => {
      if (err) throw err;
    });
    io.to(roomId).emit('checkmessage', ({ chatroom_id:roomId,sender_id:userId}));
    console.log('WebSocket message received:', message);
  });*/

  socket.on('resetchecked', (data) => {
    const userId= data.userId;
    const roomId= data.roomId;
    const query = "UPDATE chatjoins SET checked=0 WHERE chatroom_id='"+roomId+"' AND user_id='"+userId+"'";
    connection.query(query, (err) => {
      if (err) throw err;
    });
    console.log('reset');
  });


// 클라이언트에서 보내는 locationUpdate 이벤트 수신
socket.on('askLocationUpdate', (data) => {
  // console.log('Received locationUpdate event:', data);
  // 클라이언트로부터 전송된 위치 정보 로그
  // console.log(`Location data received from client - Latitude: ${data.latitude}, Longitude: ${data.longitude}`);

  // 같은 room_id를 가진 클라이언트에게 위치 정보 전송
  const query = "SELECT user_id FROM locationjoins WHERE locationroom_id = '"+data.locationroomId+"'";
  console.log(`userId: ${data.userId}, roomId: ${data.locationroomId}`);
  connection.query(query, (err, results) => {
      if (err) throw err;
      else {
        console.log("Results from database:", results);
          results.forEach((result) => {
            //사용자의 websocket id가 있는지 확인
            console.log(`User ID: ${result.user_id}, Socket ID: ${users[result.user_id]}`);

              const userSocket = users[result.user_id];
              if (userSocket && userSocket !== socket.id) {
                console.log(`Sending location to user ${result.user_id}`);
                  io.to(userSocket).emit('getOtherlocation', data);
                  console.log('data', data);
              }
          });
      }
  });
});


  // 클라이언트 연결 종료 시
  socket.on('close', (code, reason) => {
    console.log(`WebSocket connection closed with code ${code} and reason: ${reason}`);
  });
})

app.post('/signup', (req, res) => {
  const userId= req.body.user_id;
  const email= req.body.email;
  const nickname= req.body.nickname;
  const password= req.body.password;

  // Validate inputs
  /*if (!userId || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력하세요.' });
  }*/

  const query = "INSERT INTO users VALUES('"+userId+"','"+email+"','"+nickname+"','"+password+"',NULL)";
  connection.query(query, (err) => {
    if (err) throw err;
    return res.json({message:"회원가입 성공!!"});
  });
});

app.post('/login', (req, res) => {
  const userId= req.body.user_id;
  const password= req.body.password;
  console.log("로그인 시도")

  // Validate inputs
  if (!userId || !password) {
    return res.json({ message: '아이디와 비밀번호를 모두 입력하세요.' });
  }

  // Check user credentials
  const query = "SELECT * FROM users WHERE user_id = '"+userId+"' AND password = '"+password+"'";
  connection.query(query, (err, results) => {
    if (err) throw err;
    else if (results.length > 0) {
      return res.json({ message: '로그인 성공!', userId });
    } 
    else {
      console.log("로그인 실패!!!!!!", req.session);
      return res.json({ err: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
  });
});

/*app.post('/updateprofile', upload.single('file'), (req, res) => {
  
});*/

app.post('/ChattingRoomList', (req, res) => {
  const userId= req.body.user_id;

  //const query = "SELECT * FROM rooms WHERE EXISTS (SELECT 1 FROM chatjoins WHERE chatjoins.chatroom_id = rooms.chatroom_id AND chatjoins.user_id = '"+userId+"') ORDER BY last_time DESC";
  const query = "SELECT rooms.*, checked FROM rooms LEFT JOIN chatjoins ON chatjoins.chatroom_id = rooms.chatroom_id WHERE chatjoins.user_id = '"+userId+"' ORDER BY rooms.last_time DESC";
  
  connection.query(query, (err, results) => {
    if (err) throw err;
    else {
      console.log(results);
      return res.json({ data :results });
    }
  });
  
});

app.post('/Chats', (req, res) => {
  const roomId= req.body.room_id;
  const query = "SELECT chats.*, nickname FROM chats LEFT JOIN users ON chats.sender_id = users.user_id WHERE chatroom_id = '"+roomId+"'";
  connection.query(query, (err, results) => {
    if (err) throw err;
    else {
      return res.json({ data: results });
    }
  });
});


const port = 80;
const host = '0.0.0.0';

server.listen(port, () => {
  console.log(`서버가 http://${host}:${port} 에서 실행 중입니다.`);
});