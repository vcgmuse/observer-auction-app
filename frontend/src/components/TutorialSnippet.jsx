// frontend/src/components/TutorialSnippet.jsx
import React from 'react';

const TutorialSnippet = ({ children }) => {
    return (
        <div className="tutorial-snippet">
            {children}
        </div>
    );
};

export default TutorialSnippet;