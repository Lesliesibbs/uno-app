import React, { useState } from "react";
import Modal from "@material-ui/core/Modal";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import history from "../utils/history.js";
import ApiEndpoint from "../utils/ApiEndpoint.js";

function CreateModal({ open, setOpen, userName }) {
  const [fillBots, setFillBots] = useState(false);
  const [err, setErr] = useState(null);

  const createGame = async () => {
    const newGameData = await new ApiEndpoint("/api/newGame").postReq({
      botFill: fillBots,
      userName: userName
    });
    if (newGameData.hasOwnProperty("err")) {
      setError(newGameData.err);
      console.log("err");
    } else {
      history.push(`lobby/${newGameData.id}`);
    }
  };

  const containerStyle = {
    position: "absolute",
    width: "50%",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)"
  };

  const modalStyle = {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    flexDirection: "column",
    backgroundColor: "#fff"
  };

  return (
    <Modal
      aria-labelledby="create game"
      aria-describedby="create game popup"
      open={open}
      onClose={setOpen}
    >
      <div style={containerStyle}>
        <div style={modalStyle}>
          <FormControlLabel
            control={
              <Checkbox
                checked={fillBots}
                onChange={() => setFillBots(!fillBots)}
                value="checkedB"
                color="primary"
                style={{ marginLeft: "1em" }}
              />
            }
            label="fill with bots"
          />
          <Button onClick={createGame}>Create Game</Button>
        </div>
      </div>
    </Modal>
  );
}

export default CreateModal;
