// frontend/src/components/ObserverControl.jsx
import React, { useState } from 'react';
import TutorialSnippet from './TutorialSnippet';

const ObserverControl = ({ observerId, observerName, initialAttached, onAttach, onDetach }) => {
    const [attached, setAttached] = useState(initialAttached);

    const toggleAttachment = () => {
        const newAttachedState = !attached;
        setAttached(newAttachedState);
        if (newAttachedState) {
            onAttach(observerId);
        } else {
            onDetach(observerId);
        }
    };

    return (
        <div className="card">
            <h3>Observer Control: {observerName}</h3>
            <TutorialSnippet>
                This panel controls whether **{observerName}** is **attached**
                (subscribing to updates) or **detached** (unsubscribing) from the
                **Auction Item (Subject)**.
            </TutorialSnippet>
            <p>Current Status:
                <strong style={{ color: attached ? 'green' : 'red' }}>
                    {attached ? 'ATTACHED' : 'DETACHED'}
                </strong>
            </p>
            <button onClick={toggleAttachment}>
                {attached ? 'Detach' : 'Attach'}
            </button>
            <TutorialSnippet>
                Clicking 'Detach' removes this observer from the Subject's list.
                It will no longer receive `update()` calls.
                Clicking 'Attach' adds it back.
            </TutorialSnippet>
        </div>
    );
};

export default ObserverControl;