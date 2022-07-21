import { wrapAround, containsOnlyLettersAndUnderscores, replaceIllegalFileNameCharactersInString} from '../utils/Utils';

test('If wrapAround wraps correctly', () => {
    expect(wrapAround(100,5)).toBe(0);
    expect(wrapAround(100,7)).toBe(2);
});

test('If wrapAround errors out when dividing by zero', () => {
    expect(wrapAround(100,0)).toThrow();
});

test('Letter and underscore string validity', () => {
    expect(containsOnlyLettersAndUnderscores("asdkfj_")).toBe(true);
    expect(containsOnlyLettersAndUnderscores("asdkfj0")).toBe(false);
});

test('Letter and underscore unicode char test', () =>{ 
    expect(containsOnlyLettersAndUnderscores("asdkaÈj")).toBe(true);
    expect(containsOnlyLettersAndUnderscores("asdkaÈj0")).toBe(false);
});

test('Valid filename test', ()=>{
    expect(replaceIllegalFileNameCharactersInString("what?is\\this:")).toBe("whatisthis -");
})