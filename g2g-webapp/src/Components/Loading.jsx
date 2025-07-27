import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="loader">
      <span className="loader-text">loading</span>
      <span className="load"></span>
    </div>
  );
};

export default Loading; 