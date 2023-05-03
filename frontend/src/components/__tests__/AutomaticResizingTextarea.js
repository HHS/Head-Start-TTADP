import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutomaticResizingTextarea from '../AutomaticResizingTextarea';

describe('AutomaticResizingTextarea', () => {
  const poem = `When the flush of a newborn sun fell first on Eden's green and gold,   
    Our father Adam sat under the Tree and scratched with a stick in the mold;   
    And the first rude sketch that the world had seen was joy to his mighty heart,   
    Till the Devil whispered behind the leaves: "It's pretty, but is it Art?"   
       
    Wherefore he called to his wife and fled to fashion his work anew— 
    The first of his race who cared a fig for the first, most dread review;   
    And he left his lore to the use of his sons—and that was a glorious gain   
    When the Devil chuckled: "Is it Art?" in the ear of the branded Cain.   
       
    They builded a tower to shiver the sky and wrench the stars apart,   
    Till the Devil grunted behind the bricks: "It's striking, but is it Art?" 
    The stone was dropped by the quarry-side, and the idle derrick swung,   
    While each man talked of the aims of art, and each in an alien tongue.   
       
    They fought and they talked in the north and the south, they talked and they fought in the west,
    Till the waters rose on the jabbering land, and the poor Red Clay had rest—   
    Had rest till the dank blank-canvas dawn when the dove was preened to start,  
    And the Devil bubbled below the keel: "It's human, but is it Art?"   
       
    The tale is old as the Eden Tree—as new as the new-cut tooth—   
    For each man knows ere his lip-thatch grows he is master of Art and Truth;   
    And each man hears as the twilight nears, to the beat of his dying heart,   
    The Devil drum on the darkened pane: "You did it, but was it Art?"  
       
    We have learned to whittle the Eden Tree to the shape of a surplice-peg,   
    We have learned to bottle our parents twain in the yolk of an addled egg,   
    We know that the tail must wag the dog, as the horse is drawn by the cart;   
    But the Devil whoops, as he whooped of old: "It's clever, but is it Art?"   
       
    When the flicker of London's sun falls faint on the club-room's green and gold,  
    The sons of Adam sit them down and scratch with their pens in the mold—   
    They scratch with their pens in the mold of their graves, and the ink and the anguish start   
    When the Devil mutters behind the leaves: "It's pretty, but is it art?"   
       
    Now, if we could win to the Eden Tree where the four great rivers flow,   
    And the wreath of Eve is red on the turf as she left it long ago, 
    And if we could come when the sentry slept, and softly scurry through,   
    By the favor of God we might know as much—as our father Adam knew`;

  const TextArea = () => {
    const [value, setValue] = React.useState('test');
    const onChange = (e) => setValue(e.target.value);
    return (
      <AutomaticResizingTextarea onUpdateText={onChange} onBlur={jest.fn()} inputName="test" value={value} />
    );
  };

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 500 });
  });

  it('resizes', async () => {
    render(<TextArea />);

    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();

    expect(textarea.style.height).toBe('160px');
    userEvent.clear(textarea);
    userEvent.paste(textarea, poem);
    expect(textarea).toHaveValue(poem);
    expect(textarea.style.height).toBe('500px');
  });
});
