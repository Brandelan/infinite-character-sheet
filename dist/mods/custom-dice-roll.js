import { MODULE_ID } from "../constants.js";

export class CustomRoller {
  /**
   * The event is a click event from a button in the character sheet
   * @param {*} event
   */
  static moddedSkillRoll(event, actorSheet) {
    const element = event.currentTarget;
    const dataset = element.dataset;
    const actorData = actorSheet.actor.data.data;
    const actorMods = actorData.modifiers; //could be used if we choose to use the built in global modifiers, and other modifiers
    const skillLabel = dataset.label || null;
    const skillValue = Number(dataset.level);

    //choose the attribute we're rolling against
    const attrMap = CustomRoller.getAttrs(actorData);

    //populate buttons for our roll
    const buttons = {};
    for (let [attrLabel, attrValue] of attrMap) {
      buttons[attrLabel] = {
        icon: '<i class="fas fa-check"></i>',
        label: attrLabel,
        callback: (html) => {
          let modifier = Number(html.find('input[name="modInput"]').val()); //user input modifier
          let modAttrValue = Number(attrValue);
          CustomRoller.roll(
            attrLabel,
            modAttrValue,
            skillLabel,
            skillValue,
            modifier
          );
          console.log(
            "chose key " + attrLabel + " with value of " + skillValue
          );
        },
      };
    }

    //create our actual popup
    let d = new Dialog(
      {
        title: "Let's roll!",
        content: `
      <script type="text/javascript">
        function onIncreaseByOne() {
          let val = Number(document.getElementById("modInput").value);
          document.getElementById("modInput").value = val + 1;
        }
        function onDecreaseByOne() {
          let val = Number(document.getElementById("modInput").value);
          document.getElementById("modInput").value = val - 1;
        }
      </script>
      <form class="flexrow">
        <div>
        <button type="button" onClick="onIncreaseByOne()" class="button">Easier</button>
        </div>
        <div>
        <button type="button" onClick="onDecreaseByOne()" class="button">Harder</button>
        </div>
      </form>
      <form class="flexcol">
        <div class="form-group">
          <label for="modInput">Modifier</label>
          <input type="number" name="modInput" id="modInput" placeholder="0">
        </div>
      </form>
    `,
        buttons: buttons,
        default: "two",
        close: () =>
          console.log("This always is logged no matter which option is chosen"),
      },
      {
        width: 600,
      }
    );

    d.render(true);
  }

  /**
   * Roll dice for the desired values
   *
   * @param {string} attrLabel
   * @param {number} attrValue
   * @param {string} skillLabel
   * @param {number} skillValue
   * @param {number} modifier
   * @return {Promise<Entity|Entity[]>}   The created Entity or array of Entities
   */
  static async roll(attrLabel, attrValue, skillLabel, skillValue, modifier) {
    let r = new Roll("3d6");
    r.roll();

    const calculatedValues = CustomRoller.calculateCheck(
      r.total,
      attrValue,
      skillValue,
      modifier
    );
    const messageData = CustomRoller.constructMessageData(
      r,
      r.total,
      skillLabel,
      skillValue,
      attrLabel,
      attrValue,
      modifier,
      calculatedValues
    );

    const templatePath = `/modules/${MODULE_ID}/mods/custom-dice-roll.html`;
    // Render the chat card which combines the dice roll with the drawn results
    // Render the chat card which combines the dice roll with the drawn results
    messageData.content = await renderTemplate(templatePath, {
      flavor: messageData.flavor,
      total: messageData.total,
      formula: messageData.formula,
      mouseover: messageData.mouseover,
    });

    // Create the chat message including roll data so things like dice-so-nice get triggered
    return ChatMessage.create({
      content: messageData.content,
      speaker: ChatMessage.getSpeaker({ user: game.user }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: r,
    });
  }

  /**
   *
   * @param {number} rTotal dice total
   * @param {string} skillLabel name of the skill modifier
   * @param {number} skillValue value of the skill
   * @param {string} attrLabel name of the attribute
   * @param {number} attrValue value of the attribute
   * @param {number} modifier additional modifier
   * @param {object} calculatedValues container of info from our calculation telling us if we succeeded or failed
   */
  static constructMessageData(
    roll,
    rTotal,
    skillLabel,
    skillValue,
    attrLabel,
    attrValue,
    modifier,
    calculatedValues
  ) {
    const speaker = ChatMessage.getSpeaker({ user: game.user });
    const crit = calculatedValues.critical ? "CRITICAL " : "";
    const successMessage = calculatedValues.success ? "Success" : "Failure";

    const messageData = {
      user: game.user._id,
      speaker: speaker,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
      total: calculatedValues.auto
        ? crit + successMessage
        : crit + successMessage + " by " + calculatedValues.margin, //don't show the fail or loss rate when an auto fail/success happens
      flavor:
        "dice: " +
        "<b>" +
        rTotal +
        "</b>" +
        "<p>" +
        skillLabel +
        ": " +
        "<b>" +
        skillValue +
        "</b>, " +
        attrLabel +
        ": " +
        "<b>" +
        attrValue +
        "</b>" +
        ", modifier: " +
        "<b>" +
        modifier +
        "</b></p>",
      formula:
        "<b>" +
        rTotal +
        "</b>" +
        " vs " +
        "<b>" +
        Number(attrValue + skillValue + modifier) +
        "</b>",
      mouseover:
        rTotal + " < " + attrValue + " + " + skillValue + " + " + modifier,

      // roll: roll,
      // sound: roll ? CONFIG.sounds.dice : null,
      // flags: { "core.RollTable": this.id },
    };

    return messageData;
  }

  /**
   *
   * @param {*} data The actor sheet data from the foundryVTT ActorSheet to get our data from
   */
  static getAttrs(data) {
    for (let skill in data.primaryAttributes) {
      console.log(skill, data.primaryAttributes[skill].value);
    }

    let attrs = new Map();
    attrs.set("strength", data.primaryAttributes["strength"].value);
    attrs.set("dexterity", data.primaryAttributes["dexterity"].value);
    attrs.set("health", data.primaryAttributes["health"].value);
    attrs.set("awareness", data.primaryAttributes["awareness"].value);
    attrs.set("iq", data.infiniteAttrs["iq"].value);
    attrs.set("will", data.infiniteAttrs["will"].value);
    attrs.set("charisma", data.infiniteAttrs["charisma"].value);

    //add null attribute

    return attrs;
  }

  /**
   * Calculate our dice
   * Formulat is DiceValue < attrValue + skillValue + modifier
   * @param {number} diceValue
   * @param {number} attrValue
   * @param {number} skillValue
   * @param {number} modifier
   */
  static calculateCheck(diceValue, attrValue, skillValue, modifier) {
    const skillCheck = skillValue + attrValue + modifier;
    const outVals = {
      success: false,
      margin: 0,
      critical: false,
      auto: false,
    };
    outVals.margin = Math.abs(skillCheck - diceValue);

    if (diceValue <= skillCheck) {
      outVals.success = true;
    } else {
      outVals.success = false;
    }

    //now determine crits
    if (diceValue === 18) {
      outVals.success = false; //always a failure, override previous values
      outVals.critical = true;
      outVals.auto = true;
    }
    if (diceValue === 17 && skillCheck >= 16) {
      outVals.success = false;
      outVals.auto = true;
    }
    if (diceValue === 17 && skillCheck < 16) {
      outVals.success = false;
      outVals.critical = true;
      outVals.auto = true;
    }
    if (diceValue === 5 && skillCheck >= 15) {
      outVals.critical = true;
      outVals.auto = true;
    }
    if (diceValue === 6 && skillCheck >= 16) {
      outVals.critical = true;
      outVals.auto = true;
    }
    if (diceValue === 4) {
      outVals.critical = true;
      outVals.auto = true;
    }
    if (diceValue === 3) {
      outVals.critical = true;
      outVals.auto = true;
    }

    return outVals;
  }
}
