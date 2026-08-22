import fs from "node:fs";

const questPath = "src/domain/gameplay/canonical/data/quests_20260822.json";
const characterPath = "src/domain/gameplay/canonical/data/characters_20260821.json";
const skillPath = "src/domain/gameplay/canonical/data/skills_20260821.json";
const encounterPath = "src/domain/gameplay/canonical/data/quest_encounters_20260822.json";
const quests = JSON.parse(fs.readFileSync(questPath, "utf8"));
const characters = JSON.parse(fs.readFileSync(characterPath, "utf8")).characters;
const skills = JSON.parse(fs.readFileSync(skillPath, "utf8")).skills;

const tactics = { shinjuku: "BALANCED", shibuya: "ATTACK_PRIORITY", ikebukuro: "BALANCED", roppongi: "SKILL_PRIORITY", akihabara: "SKILL_PRIORITY", kawasaki: "ATTACK_PRIORITY", yokohama: "BALANCED" };
const m = (characterId, ...skillLoadout) => [characterId, ...skillLoadout];
const matrix = {
  q_shinjuku_1: [5,0,[m("char_tomoya_01","SKILL_001"),m("char_jihoon_01","SKILL_004"),m("char_shin_01","SKILL_002","SKILL_003")]],
  q_shinjuku_2: [12,0,[m("char_yuki_01","SKILL_016","SKILL_006"),m("char_kageyama_01","SKILL_014","SKILL_017"),m("char_leon_01","SKILL_021","SKILL_019"),m("char_serika_01","SKILL_010","SKILL_015"),m("char_mio_01","SKILL_023","SKILL_029")]],
  q_shinjuku_3: [19,0,[m("char_reiji_01","SKILL_054","SKILL_047","SKILL_036"),m("char_mio_01","SKILL_060","SKILL_048","SKILL_039"),m("char_takuro_01","SKILL_044","SKILL_035","SKILL_021"),m("char_leon_01","SKILL_042","SKILL_027","SKILL_019"),m("char_kageyama_01","SKILL_041","SKILL_024","SKILL_026")]],
  q_shibuya_1: [5,0,[m("char_naoto_01","SKILL_008"),m("char_minami_01","SKILL_004"),m("char_ren_male_01","SKILL_011")]],
  q_shibuya_2: [12,0,[m("char_noa_01","SKILL_020","SKILL_011"),m("char_yukina_01","SKILL_034","SKILL_008"),m("char_martina_01","SKILL_024","SKILL_023"),m("char_sora_01","SKILL_065","SKILL_021"),m("char_reina_01","SKILL_066","SKILL_020")]],
  q_shibuya_3: [24,1,[m("char_ageha_01","SKILL_055","SKILL_045","SKILL_037"),m("char_leo_01","SKILL_056","SKILL_042","SKILL_021"),m("char_sora_01","SKILL_065","SKILL_046","SKILL_034"),m("char_reina_01","SKILL_066","SKILL_020","SKILL_027"),m("char_martina_01","SKILL_048","SKILL_024","SKILL_023")]],
  q_ikebukuro_1: [5,0,[m("char_kenji_01","SKILL_001"),m("char_momoko_01","SKILL_007"),m("char_shun_01","SKILL_002")]],
  q_ikebukuro_2: [11,0,[m("char_chang_01","SKILL_027","SKILL_011"),m("char_takeshi_01","SKILL_016","SKILL_006"),m("char_koharu_01","SKILL_053","SKILL_006"),m("char_momoko_01","SKILL_013","SKILL_029"),m("char_kenji_01","SKILL_028","SKILL_011")]],
  q_ikebukuro_3: [16,0,[m("char_koharu_01","SKILL_053","SKILL_028","SKILL_006"),m("char_takeshi_01","SKILL_031","SKILL_006","SKILL_011"),m("char_chang_01","SKILL_042","SKILL_027","SKILL_036"),m("char_momoko_01","SKILL_039","SKILL_029","SKILL_013"),m("char_shun_01","SKILL_022","SKILL_017","SKILL_012")]],
  q_roppongi_1: [5,0,[m("char_tatsuya_01","SKILL_001"),m("char_makoto_01","SKILL_009"),m("char_rin_01","SKILL_015")]],
  q_roppongi_2: [12,0,[m("char_shion_01","SKILL_015","SKILL_030"),m("char_kaito_01","SKILL_034","SKILL_021"),m("char_seiya_01","SKILL_026","SKILL_011"),m("char_cecile_01","SKILL_070","SKILL_025"),m("char_maya_01","SKILL_068","SKILL_019")]],
  q_roppongi_3: [20,1,[m("char_kaede_01","SKILL_059","SKILL_041","SKILL_045"),m("char_taiga_01","SKILL_043","SKILL_037","SKILL_034"),m("char_maya_01","SKILL_068","SKILL_044","SKILL_042"),m("char_cecile_01","SKILL_070","SKILL_049","SKILL_040"),m("char_seiya_01","SKILL_038","SKILL_024","SKILL_023")]],
  q_akihabara_1: [5,0,[m("char_masato_01","SKILL_008"),m("char_yoshihiko_01","SKILL_010"),m("char_souta_01","SKILL_004")]],
  q_akihabara_2: [12,0,[m("char_aoi_01","SKILL_032","SKILL_005"),m("char_mei_01","SKILL_010","SKILL_030"),m("char_ren_01","SKILL_025","SKILL_015"),m("char_alice_01","SKILL_067","SKILL_033"),m("char_rui_01","SKILL_034","SKILL_012")]],
  q_akihabara_3: [20,1,[m("char_karen_01","SKILL_057","SKILL_050","SKILL_042"),m("char_miyabi_01","SKILL_058","SKILL_049","SKILL_046"),m("char_alice_01","SKILL_067","SKILL_030","SKILL_025"),m("char_rui_01","SKILL_043","SKILL_037","SKILL_034"),m("char_aoi_01","SKILL_039","SKILL_048","SKILL_023")]],
  q_kawasaki_1: [5,0,[m("char_gou_01","SKILL_011"),m("char_daimon_01","SKILL_001"),m("char_joe_01","SKILL_006")]],
  q_kawasaki_2: [12,0,[m("char_mark_01","SKILL_027","SKILL_022"),m("char_riki_01","SKILL_016","SKILL_006"),m("char_tetsu_01","SKILL_061","SKILL_028"),m("char_lucas_01","SKILL_062","SKILL_019"),m("char_daimon_01","SKILL_035","SKILL_011")]],
  q_kawasaki_3: [19,0,[m("char_go_01","SKILL_051","SKILL_050","SKILL_036"),m("char_kengo_01","SKILL_052","SKILL_042","SKILL_035"),m("char_tetsu_01","SKILL_061","SKILL_028","SKILL_027"),m("char_lucas_01","SKILL_062","SKILL_044","SKILL_019"),m("char_riki_01","SKILL_038","SKILL_047","SKILL_016")]],
  q_yokohama_1: [5,0,[m("char_sawat_01","SKILL_004"),m("char_yuji_01","SKILL_011"),m("char_sakura_01","SKILL_005")]],
  q_yokohama_2: [12,0,[m("char_genji_01","SKILL_063","SKILL_006"),m("char_long_01","SKILL_064","SKILL_031"),m("char_sakura_01","SKILL_069","SKILL_027"),m("char_yuji_01","SKILL_028","SKILL_011"),m("char_sawat_01","SKILL_020","SKILL_018")]],
  q_yokohama_3: [23,1,[m("char_genji_01","SKILL_063","SKILL_038","SKILL_006"),m("char_long_01","SKILL_064","SKILL_047","SKILL_031"),m("char_sakura_01","SKILL_069","SKILL_042","SKILL_027"),m("char_yuji_01","SKILL_050","SKILL_028","SKILL_036"),m("char_sawat_01","SKILL_049","SKILL_030","SKILL_020")]],
};

const byCharacter = new Map(characters.map((x) => [x.character_id, x]));
const bySkill = new Map(skills.map((x) => [x.skill_id, x]));
const townName = new Map(quests.towns.map((x) => [x.townId, x.name]));
const seenCharacters = new Set(); const seenSkills = new Set();
const encounters = quests.quests.map((quest) => {
  const [level, awakening, definitions] = matrix[quest.questId] ?? [];
  const expectedCount = quest.difficulty === "EASY" ? 3 : 5;
  if (!definitions || definitions.length !== expectedCount) throw new Error(`${quest.questId}: member count`);
  const members = definitions.map(([characterId, ...skillLoadout], index) => {
    const character = byCharacter.get(characterId);
    if (!character || character.hometown !== townName.get(quest.townId)) throw new Error(`${quest.questId}: invalid Character ${characterId}`);
    if (skillLoadout.length > [3,4,5,5,5,6][awakening]) throw new Error(`${quest.questId}: slot overflow`);
    let exclusives = 0;
    for (const skillId of skillLoadout) {
      const skill = bySkill.get(skillId);
      if (!skill) throw new Error(`${quest.questId}: unknown Skill ${skillId}`);
      if (skill.exclusive_character_id) { exclusives += 1; if (skill.exclusive_character_id !== characterId) throw new Error(`${quest.questId}: exclusive mismatch ${skillId}`); }
      seenSkills.add(skillId);
    }
    if (exclusives > 1) throw new Error(`${quest.questId}: multiple exclusive Skills`);
    seenCharacters.add(characterId);
    return { slot:index+1, characterId, level, awakening, skillLoadout, equipmentLoadout:[] };
  });
  return { encounterId:`encounter_${quest.questId}`, questId:quest.questId, townId:quest.townId, difficulty:quest.difficulty, enemyTactic:tactics[quest.townId], members, normalAttackPowerBp:8000, tuningStatus:"P0_TUNABLE", isProductionEnabled:true };
});
if (seenCharacters.size !== 60 || seenSkills.size !== 70) throw new Error(`Exposure Character ${seenCharacters.size}/60, Skill ${seenSkills.size}/70`);

quests.quests = quests.quests.map((quest) => {
  const contract = quests.difficultyContracts[quest.difficulty];
  const prerequisite = quest.difficulty === "NORMAL" ? quest.questId.replace(/_2$/, "_1") : quest.difficulty === "HARD" ? quest.questId.replace(/_3$/, "_2") : null;
  return { ...quest, durationSec:contract.durationSec, vitalityCost:contract.vitalityCost, userExp:contract.userExp, cashReward:contract.cashReward, firstClearUserExp:contract.firstClearUserExp, firstClearRewards:quests.rewardPools.find((pool)=>pool.rewardPoolId===contract.firstClearRewardPoolId).items, rewardPoolId:contract.rewardPoolId, enemyEncounterId:`encounter_${quest.questId}`, unlockCondition: prerequisite ? { type:"FIRST_CLEAR", questId:prerequisite } : { type:"OPEN" }, isProductionEnabled:true };
});
quests.unresolvedContracts = [];
fs.writeFileSync(questPath, `${JSON.stringify(quests,null,2)}\n`);
fs.writeFileSync(encounterPath, `${JSON.stringify({version:"2026-08-22-v2",authority:"Phase B3-R2 Quest Gameplay v2 Production Authority",partySize:{EASY:3,NORMAL:5,HARD:5},equipment:"NONE",normalAttackPowerBp:8000,tuningStatus:"P0_TUNABLE",tactics,characterExposure:seenCharacters.size,skillExposure:seenSkills.size,encounters},null,2)}\n`);
console.log(`Generated ${encounters.length} v2 encounters; Character ${seenCharacters.size}/60; Skill ${seenSkills.size}/70.`);
