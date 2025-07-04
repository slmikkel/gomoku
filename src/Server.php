<?php

namespace Game;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Server implements MessageComponentInterface {
    protected $clients;
    protected $games;
    protected $waitingPlayers;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->games = [];
        $this->waitingPlayers = [];
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
        
        // If there's a waiting player, start a new game
        if (!empty($this->waitingPlayers)) {
            $opponent = array_shift($this->waitingPlayers);
            $this->startGame($opponent, $conn);
        } else {
            // Otherwise, add this player to waiting list
            $this->waitingPlayers[] = $conn;
            $conn->send(json_encode([
                'type' => 'status',
                'message' => 'Waiting for opponent...'
            ]));
        }
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg);
        
        switch ($data->type) {
            case 'new_game':
                $this->handleNewGame($from);
                break;
            case 'move':
                $this->handleMove($from, $data);
                break;
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
        
        // Remove from waiting players if present
        $key = array_search($conn, $this->waitingPlayers);
        if ($key !== false) {
            unset($this->waitingPlayers[$key]);
        }
        
        // Handle game cleanup if player was in a game
        foreach ($this->games as $gameId => $game) {
            if ($game['player1'] === $conn || $game['player2'] === $conn) {
                $this->endGame($gameId, 'Opponent disconnected');
                break;
            }
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function startGame($player1, $player2) {
        $gameId = uniqid();
        $this->games[$gameId] = [
            'player1' => $player1,
            'player2' => $player2,
            'board' => array_fill(0, 8, array_fill(0, 8, '')),
            'currentPlayer' => 'X'
        ];

        // Notify both players
        $player1->send(json_encode([
            'type' => 'game_start',
            'symbol' => 'X',
            'gameId' => $gameId
        ]));

        $player2->send(json_encode([
            'type' => 'game_start',
            'symbol' => 'O',
            'gameId' => $gameId
        ]));
    }

    protected function handleNewGame($player) {
        // Remove player from any existing game
        foreach ($this->games as $gameId => $game) {
            if ($game['player1'] === $player || $game['player2'] === $player) {
                $this->endGame($gameId, 'Game cancelled');
                break;
            }
        }

        // Add to waiting players
        $this->waitingPlayers[] = $player;
        $player->send(json_encode([
            'type' => 'status',
            'message' => 'Waiting for opponent...'
        ]));
    }

    protected function handleMove($from, $data) {
        // Find the game this player is in
        foreach ($this->games as $gameId => $game) {
            if ($game['player1'] === $from || $game['player2'] === $from) {
                // Validate move
                if ($this->isValidMove($game, $data->row, $data->col)) {
                    // Update board
                    $game['board'][$data->row][$data->col] = $data->symbol;
                    
                    // Switch current player
                    $game['currentPlayer'] = $game['currentPlayer'] === 'X' ? 'O' : 'X';
                    
                    // Update game state
                    $this->games[$gameId] = $game;
                    
                    // Notify both players
                    $this->broadcastMove($game, $data);
                }
                break;
            }
        }
    }

    protected function isValidMove($game, $row, $col) {
        return $row >= 0 && $row < 8 && $col >= 0 && $col < 8 && $game['board'][$row][$col] === '';
    }

    protected function broadcastMove($game, $moveData) {
        $message = json_encode([
            'type' => 'move',
            'row' => $moveData->row,
            'col' => $moveData->col,
            'symbol' => $moveData->symbol
        ]);

        $game['player1']->send($message);
        $game['player2']->send($message);
    }

    protected function endGame($gameId, $message) {
        if (isset($this->games[$gameId])) {
            $game = $this->games[$gameId];
            
            // Notify both players
            $endMessage = json_encode([
                'type' => 'game_end',
                'message' => $message
            ]);
            
            $game['player1']->send($endMessage);
            $game['player2']->send($endMessage);
            
            // Remove game
            unset($this->games[$gameId]);
        }
    }
} 