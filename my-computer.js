export const myComputerAppDefinition = {
    title: "My Computer",
    icon: "./computer_explorer-0.png",
    content: () => `
        <div style="display: flex; flex-direction: column; height: 100%; font-size:11px;">
            <div style="padding: 2px 5px; border-bottom: 1px solid #808080; background: #c0c0c0;"><u>F</u>ile <u>E</u>dit <u>V</u>iew <u>H</u>elp</div>
            <div style="padding:10px; flex-grow:1; background: white;">
                <ul style="list-style-type:none; padding-left:5px; margin-top:0;">
                    <li style="margin-bottom:5px;"><img src="./drive_3_5-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> 3¬Ω Floppy (A:)</li>
                    <li style="margin-bottom:5px;"><img src="./drive_cd_rom-1.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> (C:) Local Disk</li>
                    <li style="margin-bottom:5px;"><img src="./folder_network_cool-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> Network Neighborhood</li>
                    <li style="margin-bottom:5px;"><img src="./settings_gear_cool-0.png" style="width:20px; height:20px; vertical-align:middle; margin-right:5px;"> Control Panel</li>
                </ul>
            </div>
            <div style="padding: 2px 5px; border-top: 1px solid #808080; background: #c0c0c0;">4 object(s)</div>
        </div>`
};
