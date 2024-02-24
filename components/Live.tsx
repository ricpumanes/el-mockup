import React, { useCallback, useEffect, useState } from "react";
import { useBroadcastEvent, useEventListener, useMyPresence, useOthers } from "@/liveblocks.config"
import { CursorMode, CursorState, Reaction, ReactionEvent } from "@/types/type";

import LiveCursors from "./cursor/LiveCursors"
import CursorChat from "./cursor/CursorChat";
import ReactionSelector from "./reaction/ReactionButton";
import FlyingReaction from "./reaction/FlyingReaction";
import useInterval from "@/hooks/useInterval";

const Live = () => {
  const others = useOthers(); // returns other users in the room
  const [{ cursor }, updateMyPresence] = useMyPresence() as any; // returns my presence

  const [cursorState, setCursorState] = useState<CursorState>({
    mode: CursorMode.Hidden
  })
  const [reactions, setReactions] = useState<Reaction[]>([])

  const broadcast = useBroadcastEvent();

  // remove reactions after 5 seconds
  useInterval(() => {
    setReactions((rs) => rs.filter((r) => Date.now() - r.timestamp < 5000));
  }, 1000);

  // for my own reactions
  useInterval(() => {
    if (cursorState.mode === CursorMode.Reaction && cursorState.isPressed && cursor) {
      setReactions((rs) => rs.concat([{
        point: { x: cursor.x, y: cursor.y },
        value: cursorState.reaction,
        timestamp: Date.now()
      }]));

      broadcast({
        x: cursor.x,
        y: cursor.y,
        value: cursorState.reaction,
      })
    }
  }, 100)

  // for other users
  useEventListener((eventData) => {
    const event = eventData.event as ReactionEvent;

    setReactions((rs) => rs.concat([{
      point: { x: event.x, y: event.y },
      value: event.value,
      timestamp: Date.now()
    }]));
  });

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    event.preventDefault();

    if (cursor === null || cursorState.mode === CursorMode.ReactionSelector) {
      const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
      const y = event.clientY - event.currentTarget.getBoundingClientRect().y;
  
      updateMyPresence({ cursor: { x, y } });
    }

  }, []);

  const handlePointerLeave = useCallback(() => {
    setCursorState({ mode: CursorMode.Hidden });
    
    updateMyPresence({ cursor: null, message: null });
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    const x = event.clientX - event.currentTarget.getBoundingClientRect().x;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().y;

    updateMyPresence({ cursor: { x, y } });

    setCursorState((state: CursorState) => {
      if (cursorState.mode === CursorMode.Reaction) {
        return {
          ...state,
          isPressed: true
        }
      }

      return state;
    });
  }, [cursorState.mode, setCursorState]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    setCursorState((state: CursorState) => {
      if (cursorState.mode === CursorMode.Reaction) {
        return {
          ...state,
          isPressed: true
        }
      }

      return state;
    })
  }, [cursorState.mode, setCursorState]);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === '/') {
        setCursorState({
          mode: CursorMode.Chat,
          previousMessage: null,
          message: '' });
      }

      if (event.key === 'Escape') {
        updateMyPresence({ message: '' });
        setCursorState({ mode: CursorMode.Hidden });
      }

      if (event.key === 'e' && cursorState.mode !== CursorMode.Chat) {
        setCursorState({
          mode: CursorMode.ReactionSelector,
        })
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/') {
        event.preventDefault();
      }
    };

    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onKeyDown);
    }
  }, [updateMyPresence, cursorState.mode])

  const setReaction = useCallback((reaction: string) => {
    setCursorState({ mode: CursorMode.Reaction, reaction, isPressed: false });
  }, [])
  

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="h-[100vh] w-full flex justify-center items-center text-center"
    >
      <h1 className="text-2xl text-white">hello world</h1>

      {reactions.map((r) => (
        <FlyingReaction
          key={r.timestamp.toString()}
          x={r.point.x}
          y={r.point.y}
          timestamp={r.timestamp}
          value={r.value}
        />
      ))}

      {cursor && (<CursorChat
        cursor={cursor}
        cursorState={cursorState}
        setCursorState={setCursorState}
        updateMyPresence={updateMyPresence}
      />)}

      {cursorState.mode === CursorMode.ReactionSelector && (
        <ReactionSelector
          setReaction={setReaction}
        />
      )}
      
      <LiveCursors others={others} />
    </div>
  )
}

export default Live