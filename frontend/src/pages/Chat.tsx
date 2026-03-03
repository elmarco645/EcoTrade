import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Send, User, MessageSquare } from 'lucide-react';

export default function Chat({ user }: { user: any }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const listingIdFromUrl = queryParams.get('listingId');
  const sellerIdFromUrl = queryParams.get('sellerId');

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeChat, setActiveChat] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    newSocket.emit('join', user.id);

    newSocket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('message_sent', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      newSocket.close();
    };
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !activeChat) return;

    socket.emit('send_message', {
      sender_id: user.id,
      receiver_id: activeChat.seller_id,
      content: input,
      listing_id: activeChat.listing_id
    });
    setInput('');
  };

  // Initialize active chat from URL parameters or location state
  useEffect(() => {
    if (listingIdFromUrl && sellerIdFromUrl) {
      setActiveChat({
        listing_id: listingIdFromUrl,
        seller_id: sellerIdFromUrl,
        listingId: listingIdFromUrl // for the display label
      });
    } else if (location.state) {
      setActiveChat(location.state);
    }
  }, [listingIdFromUrl, sellerIdFromUrl, location.state]);

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-[2.5rem] bg-white shadow-xl border border-slate-100">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 bg-slate-50/50">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="p-4">
          {!activeChat ? (
            <div className="text-center py-10 text-slate-400">
              <MessageSquare className="mx-auto mb-2 opacity-20" size={48} />
              <p className="text-sm">No active conversations</p>
            </div>
          ) : (
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white shadow-sm border border-blue-100">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                S
              </div>
              <div className="text-left">
                <p className="font-bold text-sm">Seller</p>
                <p className="text-xs text-slate-400 truncate">Active conversation</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {activeChat ? (
          <>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="text-slate-400" />
                </div>
                <h3 className="font-bold">Chatting about Listing #{activeChat.listingId}</h3>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm font-medium ${
                      msg.sender_id === user.id
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="p-6 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50 pl-6 pr-16 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center transition-all hover:bg-blue-700"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <MessageSquare size={64} className="mb-4 opacity-10" />
            <p className="text-lg font-medium">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
