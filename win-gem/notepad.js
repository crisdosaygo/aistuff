export const notepadAppDefinition = {
    title: "Untitled - Notepad",
    icon: "https://win98icons.alexmeub.com/icons/png/notepad-0.png",
    content: () => `
        <div style="display: flex; flex-direction: column; height: 100%; font-size:11px;">
            <div style="padding: 2px 5px; border-bottom: 1px solid #808080; background: #c0c0c0;">
                <u>F</u>ile <u>E</u>dit <u>S</u>earch <u>H</u>elp
            </div>
            <textarea style="width: 100%; height: 100%; border: none; font-family: 'Lucida Console', 'Courier New', monospace; font-size:12px; resize:none; box-sizing: border-box; padding:2px;" placeholder=""></textarea>
        </div>`
};
