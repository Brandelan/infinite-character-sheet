import {
  SuccessRoll,
  SuccessRollRenderer,
  DamageRoll,
  DamageRollRenderer,
} from "../../lib/gurps-foundry-roll-lib/gurps-foundry-roll-lib.js";

// import { DND5E } from "../../systems/dnd5e/module/config.js";
import { gurpsActorSheet } from "/systems/gurps4e/module/actor/actor-sheet.js";
import { MODULE_ID } from "../../constants.js";
import { CustomRoller } from "../../mods/custom-dice-roll.js";
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class InfiniteActorSheet extends gurpsActorSheet {
  /** @override */
  static get defaultOptions() {
    console.log(`testing, defaultOptions is ${super.defaultOptions.template}`);
    const options = super.defaultOptions;
    //override the options
    options.template = `/modules/${MODULE_ID}/templates/actor/actor-sheet.html`;
    options.width = 540;
    options.height = 900;

    console.log(`after merging, defaultOptions is ${options.template}`);
    return options;
  }

  /* -------------------------------------------- */
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    //MODDED SECTION!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    html.find(".moddedRollable").click(this._onModdedSkillRoll.bind(this));
  }

  /**-------------------------------------------------------------------
   * MODDED SECTION!!!! Note, for this section to work,
   * listeners were updated at top of this class,
   * and also the skills section of the actor-sheet.html had its class changed to moddedRollable
   *------------------------------------------------------------------*/

  /**
   * Handles customSkill rolls against attribute rolls
   * @param {*} event
   */
  _onModdedSkillRoll(event) {
    event.preventDefault();
    CustomRoller.moddedSkillRoll(event, this);
  }
}
