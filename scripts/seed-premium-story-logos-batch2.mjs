#!/usr/bin/env node
/**
 * Seed premium bilingual kids stories from Desktop/story_logos (batch 21–37).
 *
 * Usage:
 *   node scripts/seed-premium-story-logos-batch2.mjs
 *   node scripts/seed-premium-story-logos-batch2.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.STORY_IMAGE_BUCKET || 'story-images';
const LOGOS_DIR =
  process.env.STORY_LOGOS_DIR || path.join('/home/chinhdz/Desktop/story_logos');

function tokenize(sentence, vocab = []) {
  const map = new Map(vocab.map((v) => [v.word.toLowerCase(), v.vi]));
  const parts = sentence.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/).filter((p) => p.length);
  return parts.map((display) => {
    const clean = display.replace(/[.,!?]/g, '').toLowerCase();
    if (!clean.trim()) return { display, norm: '', lemma: '' };
    const vi = map.get(clean);
    return vi
      ? { display, norm: clean, lemma: clean, vi }
      : { display, norm: clean, lemma: clean };
  });
}

function buildPanels(sentences, coverUrl, vocab) {
  return sentences.map(([en, vi], i) => ({
    panel_id: i + 1,
    image: coverUrl,
    image_alt: en.slice(0, 80),
    sentence_en: en,
    sentence_vi: vi,
    tokens: tokenize(en, vocab),
  }));
}

function buildGames(vocab, panels) {
  const match = vocab.slice(0, 6).map((v) => ({ word: v.word, vi: v.vi }));
  const fill_blank = panels.slice(0, 3).map((p) => {
    const words = p.sentence_en.split(/\s+/).filter((w) => w.replace(/[.,!?]/g, '').length > 3);
    const pick = words[Math.min(1, words.length - 1)] || words[0] || 'word';
    const answer = pick.replace(/[.,!?]/g, '');
    const distractors = vocab
      .map((v) => v.word)
      .filter((w) => w.toLowerCase() !== answer.toLowerCase())
      .slice(0, 2);
    while (distractors.length < 2) distractors.push(distractors.length === 0 ? 'happy' : 'friend');
    return {
      sentence_en: p.sentence_en.replace(pick, '___'),
      answer,
      choices: [answer, ...distractors].sort(() => Math.random() - 0.5),
    };
  });
  return { match, fill_blank };
}

function story(cfg) {
  return {
    level: 'Beginner',
    estimated_minutes: 4,
    published: true,
    premium_only: true,
    curriculum_stage_id: 'a2-key',
    ...cfg,
    vocabulary: cfg.vocab.map((v) => ({ word: v.word, vi: v.vi, ipa: '' })),
  };
}

/** @type {Array<any>} */
const STORIES = [
  story({
    id: 'premium-liam-and-the-magic-paintbrush',
    title_en: 'Liam and the Magic Paintbrush',
    title_vi: 'Liam và Cây Cọ Vẽ Kỳ Diệu',
    topics: ['Fantasy', 'Art', 'Adventure'],
    coverFile: '21. Liam and the Magic Paintbrush.png',
    vocab: [
      { word: 'paintbrush', vi: 'cọ vẽ' },
      { word: 'magic', vi: 'kỳ diệu' },
      { word: 'paint', vi: 'vẽ' },
      { word: 'color', vi: 'màu sắc' },
      { word: 'picture', vi: 'bức tranh' },
      { word: 'bright', vi: 'sáng' },
      { word: 'create', vi: 'tạo ra' },
      { word: 'smile', vi: 'nụ cười' },
    ],
    sentences: [
      ['Liam found a magic paintbrush in his art box.', 'Liam tìm thấy một cây cọ vẽ kỳ diệu trong hộp đồ họa.'],
      ['"What should I paint?" he asked with a smile.', '"Mình nên vẽ gì?" cậu hỏi với nụ cười.'],
      ['He painted a bright sun, and it warmed the room.', 'Cậu vẽ mặt trời sáng, và nó sưởi ấm căn phòng.'],
      ['Next he painted a soft blue bird that sang.', 'Tiếp theo cậu vẽ một chú chim xanh mềm mại biết hót.'],
      ['Friends came to see his colorful pictures.', 'Bạn bè đến xem những bức tranh đầy màu sắc của cậu.'],
      ['Liam shared the paintbrush so everyone could create.', 'Liam chia sẻ cọ vẽ để mọi người cùng tạo ra.'],
      ['Together they painted a happy garden full of color.', 'Họ cùng vẽ một khu vườn vui vẻ đầy màu sắc.'],
      ['"Art is magic when we share it," said Liam.', '"Nghệ thuật là phép màu khi mình chia sẻ," Liam nói.'],
    ],
  }),
  story({
    id: 'premium-the-floating-island-of-cats',
    title_en: 'The Floating Island of Cats',
    title_vi: 'Hòn Đảo Nổi Của Những Chú Mèo',
    topics: ['Animals', 'Adventure', 'Fantasy'],
    coverFile: '22. The Floating Island of Cats.png',
    vocab: [
      { word: 'island', vi: 'hòn đảo' },
      { word: 'floating', vi: 'nổi' },
      { word: 'cat', vi: 'mèo' },
      { word: 'cloud', vi: 'đám mây' },
      { word: 'soft', vi: 'mềm' },
      { word: 'purr', vi: 'kêu gừ gừ' },
      { word: 'visit', vi: 'thăm' },
      { word: 'gentle', vi: 'dịu dàng' },
    ],
    sentences: [
      ['High above the clouds floated a soft island of cats.', 'Cao trên mây, một hòn đảo mềm của những chú mèo đang nổi.'],
      ['Little cats purred and played on gentle grass.', 'Những chú mèo nhỏ gừ gừ và chơi trên cỏ êm.'],
      ['A girl named Mia visited the floating island.', 'Một cô bé tên Mia đến thăm hòn đảo nổi.'],
      ['"Welcome!" meowed the cats. "Please be gentle."', '"Chào mừng!" mèo kêu. "Hãy dịu dàng nhé."'],
      ['Mia shared milk and soft treats with her new friends.', 'Mia chia sẻ sữa và đồ ngon mềm với bạn mới.'],
      ['They watched pink clouds float by together.', 'Họ cùng nhìn những đám mây hồng trôi qua.'],
      ['Mia promised to visit the island again soon.', 'Mia hứa sẽ sớm thăm hòn đảo lần nữa.'],
      ['The cats waved goodbye with happy tails.', 'Những chú mèo vẫy chào tạm biệt bằng đuôi vui vẻ.'],
    ],
  }),
  story({
    id: 'premium-zoes-cosmic-music-box',
    title_en: "Zoe's Cosmic Music Box",
    title_vi: 'Hộp Nhạc Vũ Trụ Của Zoe',
    topics: ['Music', 'Fantasy', 'Space'],
    coverFile: "23. Zoe's Cosmic Music Box.png",
    vocab: [
      { word: 'music', vi: 'âm nhạc' },
      { word: 'box', vi: 'hộp' },
      { word: 'cosmic', vi: 'vũ trụ' },
      { word: 'star', vi: 'ngôi sao' },
      { word: 'melody', vi: 'giai điệu' },
      { word: 'dance', vi: 'nhảy múa' },
      { word: 'sparkle', vi: 'lấp lánh' },
      { word: 'listen', vi: 'lắng nghe' },
    ],
    sentences: [
      ['Zoe opened a cosmic music box full of sparkle.', 'Zoe mở một hộp nhạc vũ trụ đầy ánh lấp lánh.'],
      ['A soft melody floated out like silver stars.', 'Một giai điệu êm trôi ra như những ngôi sao bạc.'],
      ['The stars began to dance around her room.', 'Những ngôi sao bắt đầu nhảy quanh phòng cô.'],
      ['Zoe listened carefully and hummed along.', 'Zoe lắng nghe cẩn thận và ngân nga theo.'],
      ['"Music makes the universe smile," she said.', '"Âm nhạc làm vũ trụ mỉm cười," cô nói.'],
      ['She shared the music box with her little brother.', 'Cô chia sẻ hộp nhạc với em trai.'],
      ['Together they danced under sparkling light.', 'Họ cùng nhảy dưới ánh sáng lấp lánh.'],
      ['The cosmic melody sang them gently to sleep.', 'Giai điệu vũ trụ dịu dàng ru họ ngủ.'],
    ],
  }),
  story({
    id: 'premium-the-secret-sandcastle-city',
    title_en: 'The Secret Sandcastle City',
    title_vi: 'Thành Phố Lâu Đài Cát Bí Mật',
    topics: ['Adventure', 'Beach', 'Friendship'],
    coverFile: '24. The Secret Sandcastle City.png',
    vocab: [
      { word: 'sandcastle', vi: 'lâu đài cát' },
      { word: 'secret', vi: 'bí mật' },
      { word: 'city', vi: 'thành phố' },
      { word: 'beach', vi: 'bãi biển' },
      { word: 'build', vi: 'xây' },
      { word: 'wave', vi: 'sóng' },
      { word: 'shell', vi: 'vỏ sò' },
      { word: 'team', vi: 'đội' },
    ],
    sentences: [
      ['On a sunny beach, kids found a secret sandcastle city.', 'Trên bãi biển nắng, các bạn tìm thấy thành phố lâu đài cát bí mật.'],
      ['Tiny towers sparkled with pretty shells.', 'Những tháp nhỏ lấp lánh với vỏ sò xinh.'],
      ['"Let us build more!" said the team.', '"Mình xây thêm đi!" cả đội nói.'],
      ['They shaped roads, bridges, and a soft sea wall.', 'Họ nặn đường, cầu và tường biển mềm.'],
      ['Gentle waves came close but did not wash it away.', 'Sóng êm đến gần nhưng không cuốn mất.'],
      ['A crab waved hello from a sandy door.', 'Một con cua vẫy chào từ cánh cửa cát.'],
      ['The kids promised to care for their secret city.', 'Các bạn hứa sẽ chăm sóc thành phố bí mật.'],
      ['At sunset the sandcastle city glowed golden.', 'Lúc hoàng hôn, thành phố lâu đài cát óng ánh vàng.'],
    ],
  }),
  story({
    id: 'premium-noahs-flying-bicycle',
    title_en: "Noah's Flying Bicycle",
    title_vi: 'Chiếc Xe Đạp Bay Của Noah',
    topics: ['Adventure', 'Fantasy', 'Friendship'],
    coverFile: "25. Noah's Flying Bicycle.png",
    vocab: [
      { word: 'bicycle', vi: 'xe đạp' },
      { word: 'fly', vi: 'bay' },
      { word: 'sky', vi: 'bầu trời' },
      { word: 'pedal', vi: 'đạp' },
      { word: 'wind', vi: 'gió' },
      { word: 'brave', vi: 'dũng cảm' },
      { word: 'high', vi: 'cao' },
      { word: 'friend', vi: 'bạn' },
    ],
    sentences: [
      ['Noah found a bicycle that could fly in the sky.', 'Noah tìm thấy chiếc xe đạp có thể bay trên trời.'],
      ['He pedaled hard and felt the wind on his face.', 'Cậu đạp mạnh và cảm nhận gió trên mặt.'],
      ['"I am brave!" laughed Noah as he rose high.', '"Mình dũng cảm!" Noah cười khi bay cao.'],
      ['Birds flew beside him and sang a welcome song.', 'Chim bay cạnh cậu và hát bài chào mừng.'],
      ['Noah invited a friend to ride in the sky basket.', 'Noah mời một người bạn ngồi giỏ bay trên trời.'],
      ['They waved to houses and trees far below.', 'Họ vẫy chào nhà cửa và cây cối phía dưới.'],
      ['The flying bicycle landed softly on the grass.', 'Chiếc xe đạp bay hạ cánh êm trên cỏ.'],
      ['"Best ride ever!" said Noah and his friend.', '"Chuyến đi tuyệt nhất!" Noah và bạn nói.'],
    ],
  }),
  story({
    id: 'premium-the-giant-sunflower-maze',
    title_en: 'The Giant Sunflower Maze',
    title_vi: 'Mê Cung Hoa Hướng Dương Khổng Lồ',
    topics: ['Nature', 'Adventure', 'Friendship'],
    coverFile: '26. The Giant Sunflower Maze.png',
    vocab: [
      { word: 'sunflower', vi: 'hoa hướng dương' },
      { word: 'maze', vi: 'mê cung' },
      { word: 'giant', vi: 'khổng lồ' },
      { word: 'path', vi: 'đường' },
      { word: 'yellow', vi: 'màu vàng' },
      { word: 'find', vi: 'tìm' },
      { word: 'map', vi: 'bản đồ' },
      { word: 'together', vi: 'cùng nhau' },
    ],
    sentences: [
      ['The children entered a giant sunflower maze.', 'Các bạn nhỏ bước vào mê cung hoa hướng dương khổng lồ.'],
      ['Tall yellow flowers made a soft golden path.', 'Những bông hoa vàng cao tạo lối đi vàng êm.'],
      ['"Where is the way out?" asked a little boy.', '"Lối ra đâu?" một cậu bé hỏi.'],
      ['They used a simple map and stayed together.', 'Họ dùng bản đồ đơn giản và đi cùng nhau.'],
      ['Bees buzzed gently and showed a sunny turn.', 'Ong vo ve nhẹ và chỉ một khúc rẽ nắng.'],
      ['At the center they found a picnic of smiles.', 'Ở giữa họ tìm thấy một buổi picnic đầy nụ cười.'],
      ['Finding the exit was easy with good friends.', 'Tìm lối ra thật dễ với những người bạn tốt.'],
      ['The giant sunflower maze became their favorite game.', 'Mê cung hoa hướng dương khổng lồ thành trò chơi yêu thích.'],
    ],
  }),
  story({
    id: 'premium-ava-and-the-crystal-cave',
    title_en: 'Ava and the Crystal Cave',
    title_vi: 'Ava và Hang Pha Lê',
    topics: ['Adventure', 'Nature', 'Fantasy'],
    coverFile: '27. Ava and the Crystal Cave.png',
    vocab: [
      { word: 'crystal', vi: 'pha lê' },
      { word: 'cave', vi: 'hang động' },
      { word: 'shine', vi: 'tỏa sáng' },
      { word: 'explore', vi: 'khám phá' },
      { word: 'careful', vi: 'cẩn thận' },
      { word: 'light', vi: 'ánh sáng' },
      { word: 'echo', vi: 'tiếng vang' },
      { word: 'wonder', vi: 'kỳ diệu' },
    ],
    sentences: [
      ['Ava explored a cave full of shining crystals.', 'Ava khám phá hang động đầy pha lê tỏa sáng.'],
      ['Soft light danced on the cool stone walls.', 'Ánh sáng dịu nhảy múa trên tường đá mát.'],
      ['"I will be careful," Ava whispered.', '"Mình sẽ cẩn thận," Ava thì thầm.'],
      ['Her footsteps made a friendly echo.', 'Bước chân cô tạo tiếng vang thân thiện.'],
      ['A crystal path led her deeper with wonder.', 'Lối pha lê dẫn cô sâu hơn trong sự kỳ diệu.'],
      ['She found a crystal heart that glowed pink.', 'Cô tìm thấy trái tim pha lê hồng phát sáng.'],
      ['Ava left it there so the cave could keep shining.', 'Ava để lại để hang tiếp tục tỏa sáng.'],
      ['Outside she told friends about the crystal cave.', 'Bên ngoài cô kể bạn bè về hang pha lê.'],
    ],
  }),
  story({
    id: 'premium-the-little-bears-big-balloon',
    title_en: "The Little Bear's Big Balloon",
    title_vi: 'Chú Gấu Nhỏ Và Quả Bóng Bay To',
    topics: ['Animals', 'Friendship', 'Adventure'],
    coverFile: "28. The Little Bear's Big Balloon.png",
    vocab: [
      { word: 'bear', vi: 'gấu' },
      { word: 'balloon', vi: 'bóng bay' },
      { word: 'big', vi: 'to' },
      { word: 'hold', vi: 'cầm' },
      { word: 'float', vi: 'bay lên' },
      { word: 'share', vi: 'chia sẻ' },
      { word: 'happy', vi: 'vui' },
      { word: 'friend', vi: 'bạn' },
    ],
    sentences: [
      ['A little bear held a big red balloon.', 'Một chú gấu nhỏ cầm quả bóng bay đỏ to.'],
      ['The balloon wanted to float up to the sky.', 'Quả bóng muốn bay lên bầu trời.'],
      ['"Stay with me," said the little bear happily.', '"Ở với tớ nhé," chú gấu nhỏ nói vui vẻ.'],
      ['He shared the balloon string with a tiny bird.', 'Cậu chia sẻ sợi dây bóng với một chú chim nhỏ.'],
      ['Together they walked through a sunny field.', 'Họ cùng đi qua cánh đồng nắng.'],
      ['Friends came to play with the big balloon.', 'Bạn bè đến chơi với quả bóng to.'],
      ['The little bear smiled and shared with everyone.', 'Chú gấu nhỏ mỉm cười và chia sẻ với mọi người.'],
      ['"Big balloons are best with friends," he said.', '"Bóng to thì vui nhất với bạn bè," cậu nói.'],
    ],
  }),
  story({
    id: 'premium-chloes-underwater-playground',
    title_en: "Chloe's Underwater Playground",
    title_vi: 'Sân Chơi Dưới Nước Của Chloe',
    topics: ['Animals', 'Ocean', 'Friendship'],
    coverFile: "29. Chloe's Underwater Playground.png",
    vocab: [
      { word: 'underwater', vi: 'dưới nước' },
      { word: 'playground', vi: 'sân chơi' },
      { word: 'swim', vi: 'bơi' },
      { word: 'fish', vi: 'cá' },
      { word: 'coral', vi: 'san hô' },
      { word: 'bubble', vi: 'bọt bóng' },
      { word: 'slide', vi: 'cầu trượt' },
      { word: 'laugh', vi: 'cười' },
    ],
    sentences: [
      ['Chloe swam into an underwater playground.', 'Chloe bơi vào một sân chơi dưới nước.'],
      ['Fish friends slid down a coral slide.', 'Bạn cá trượt xuống cầu trượt san hô.'],
      ['Bubbles danced around Chloe like tiny stars.', 'Bọt bóng nhảy quanh Chloe như sao nhỏ.'],
      ['"This is the best playground!" she laughed.', '"Đây là sân chơi tuyệt nhất!" cô cười.'],
      ['A seahorse taught her a gentle swim race.', 'Cá ngựa dạy cô cuộc đua bơi nhẹ nhàng.'],
      ['They played hide-and-seek behind pink coral.', 'Họ chơi trốn tìm sau san hô hồng.'],
      ['Chloe thanked every fish for the fun day.', 'Chloe cảm ơn mọi chú cá vì ngày vui.'],
      ['She promised to visit the underwater playground again.', 'Cô hứa sẽ ghé sân chơi dưới nước lần nữa.'],
    ],
  }),
  story({
    id: 'premium-the-whispering-windmill',
    title_en: 'The Whispering Windmill',
    title_vi: 'Cối Xay Gió Thì Thầm',
    topics: ['Nature', 'Fantasy', 'Daily Life'],
    coverFile: '30. The Whispering Windmill.png',
    vocab: [
      { word: 'windmill', vi: 'cối xay gió' },
      { word: 'whisper', vi: 'thì thầm' },
      { word: 'wind', vi: 'gió' },
      { word: 'turn', vi: 'quay' },
      { word: 'listen', vi: 'lắng nghe' },
      { word: 'story', vi: 'câu chuyện' },
      { word: 'field', vi: 'cánh đồng' },
      { word: 'quiet', vi: 'yên tĩnh' },
    ],
    sentences: [
      ['In a quiet field stood a whispering windmill.', 'Trên cánh đồng yên tĩnh có một cối xay gió thì thầm.'],
      ['Its arms turned softly in the friendly wind.', 'Cánh của nó quay nhẹ trong gió thân thiện.'],
      ['A boy named Ben stopped to listen carefully.', 'Cậu bé Ben dừng lại lắng nghe cẩn thận.'],
      ['The windmill whispered a kind little story.', 'Cối xay gió thì thầm một câu chuyện nhỏ tử tế.'],
      ['"Share your smiles like I share the wind," it said.', '"Hãy chia sẻ nụ cười như ta chia sẻ gió," nó nói.'],
      ['Ben smiled and waved to the spinning windmill.', 'Ben mỉm cười và vẫy chào cối xay gió đang quay.'],
      ['He told the story to kids in the village.', 'Cậu kể câu chuyện cho các bạn trong làng.'],
      ['The whispering windmill kept turning happily.', 'Cối xay gió thì thầm tiếp tục quay vui vẻ.'],
    ],
  }),
  story({
    id: 'premium-ethans-robot-dinosaur',
    title_en: "Ethan's Robot Dinosaur",
    title_vi: 'Khủng Long Robot Của Ethan',
    topics: ['Fantasy', 'Friendship', 'Science'],
    coverFile: "31. Ethan's Robot Dinosaur.png",
    vocab: [
      { word: 'robot', vi: 'robot' },
      { word: 'dinosaur', vi: 'khủng long' },
      { word: 'build', vi: 'lắp ráp' },
      { word: 'beep', vi: 'kêu bip' },
      { word: 'friendly', vi: 'thân thiện' },
      { word: 'play', vi: 'chơi' },
      { word: 'help', vi: 'giúp' },
      { word: 'strong', vi: 'mạnh' },
    ],
    sentences: [
      ['Ethan built a friendly robot dinosaur.', 'Ethan lắp một chú khủng long robot thân thiện.'],
      ['It beeped hello and stomped with soft feet.', 'Nó bip chào và giậm chân mềm.'],
      ['"Let us play!" said Ethan with a big grin.', '"Mình chơi nào!" Ethan cười toe toét.'],
      ['The robot dinosaur helped carry heavy toys.', 'Khủng long robot giúp xách đồ chơi nặng.'],
      ['It was strong, kind, and never scary.', 'Nó mạnh, tốt bụng và không hề đáng sợ.'],
      ['Friends came to ride on its gentle back.', 'Bạn bè đến cưỡi trên lưng êm của nó.'],
      ['Ethan taught it to say "please" and "thank you".', 'Ethan dạy nó nói "please" và "thank you".'],
      ['The robot dinosaur became the best helper at school.', 'Khủng long robot thành trợ thủ tuyệt nhất ở trường.'],
    ],
  }),
  story({
    id: 'premium-the-magical-tree-of-seasons',
    title_en: 'The Magical Tree of Seasons',
    title_vi: 'Cây Thần Kỳ Của Bốn Mùa',
    topics: ['Nature', 'Seasons', 'Fantasy'],
    coverFile: '32. The Magical Tree of Seasons.png',
    vocab: [
      { word: 'tree', vi: 'cây' },
      { word: 'season', vi: 'mùa' },
      { word: 'spring', vi: 'mùa xuân' },
      { word: 'summer', vi: 'mùa hè' },
      { word: 'autumn', vi: 'mùa thu' },
      { word: 'winter', vi: 'mùa đông' },
      { word: 'leaf', vi: 'lá' },
      { word: 'change', vi: 'thay đổi' },
    ],
    sentences: [
      ['In the forest stood a magical tree of seasons.', 'Trong rừng có một cây thần kỳ của bốn mùa.'],
      ['In spring it wore soft pink flowers.', 'Mùa xuân nó khoác hoa hồng mềm.'],
      ['In summer its green leaves danced in the sun.', 'Mùa hè lá xanh nhảy múa dưới nắng.'],
      ['In autumn gold leaves floated like little boats.', 'Mùa thu lá vàng trôi như thuyền nhỏ.'],
      ['In winter white snow sat gently on its branches.', 'Mùa đông tuyết trắng nhẹ ngồi trên cành.'],
      ['Children visited every season to learn and play.', 'Trẻ em ghé mỗi mùa để học và chơi.'],
      ['"Every change is beautiful," whispered the tree.', '"Mọi thay đổi đều đẹp," cây thì thầm.'],
      ['The magical tree of seasons kept smiling all year.', 'Cây thần kỳ bốn mùa mỉm cười quanh năm.'],
    ],
  }),
  story({
    id: 'premium-lillys-pocket-sized-penguin',
    title_en: "Lilly's Pocket-sized Penguin",
    title_vi: 'Chú Chim Cánh Cụt Bỏ Túi Của Lilly',
    topics: ['Animals', 'Friendship', 'Emotions'],
    coverFile: "33. Lilly's Pocket-sized Penguin.png",
    vocab: [
      { word: 'penguin', vi: 'chim cánh cụt' },
      { word: 'pocket', vi: 'túi' },
      { word: 'tiny', vi: 'tí hon' },
      { word: 'waddle', vi: 'lạch bạch' },
      { word: 'cold', vi: 'lạnh' },
      { word: 'warm', vi: 'ấm' },
      { word: 'hug', vi: 'ôm' },
      { word: 'care', vi: 'chăm sóc' },
    ],
    sentences: [
      ['Lilly found a tiny penguin that fit in her pocket.', 'Lilly tìm thấy chú chim cánh cụt tí hon vừa túi.'],
      ['It waddled out and peeped a happy hello.', 'Nó lạch bạch bước ra và kêu chào vui.'],
      ['"You are so cold," said Lilly. "I will keep you warm."', '"Bạn lạnh quá," Lilly nói. "Mình sẽ giữ ấm cho bạn."'],
      ['She made a soft nest and shared a gentle hug.', 'Cô làm tổ mềm và ôm nhẹ.'],
      ['The pocket-sized penguin loved fish crackers.', 'Chim cánh cụt bỏ túi thích bánh quy cá.'],
      ['Lilly cared for it every morning and night.', 'Lilly chăm sóc nó mỗi sáng và tối.'],
      ['Friends smiled when the penguin waved its flippers.', 'Bạn bè mỉm cười khi cánh cụt vẫy vây.'],
      ['"Tiny friends need big care," said Lilly.', '"Bạn nhỏ cần sự chăm sóc lớn," Lilly nói.'],
    ],
  }),
  story({
    id: 'premium-the-midnight-train-to-dreamland',
    title_en: 'The Midnight Train to Dreamland',
    title_vi: 'Chuyến Tàu Nửa Đêm Đến Xứ Mơ',
    topics: ['Fantasy', 'Adventure', 'Emotions'],
    coverFile: '34. The Midnight Train to Dreamland.png',
    vocab: [
      { word: 'midnight', vi: 'nửa đêm' },
      { word: 'train', vi: 'tàu hỏa' },
      { word: 'dream', vi: 'giấc mơ' },
      { word: 'ticket', vi: 'vé' },
      { word: 'star', vi: 'ngôi sao' },
      { word: 'sleep', vi: 'ngủ' },
      { word: 'journey', vi: 'hành trình' },
      { word: 'soft', vi: 'êm' },
    ],
    sentences: [
      ['At midnight a soft train left for Dreamland.', 'Nửa đêm một chuyến tàu êm rời ga đến Xứ Mơ.'],
      ['Children held glowing star tickets in their hands.', 'Các bạn cầm vé ngôi sao phát sáng.'],
      ['The train windows showed rivers of silver light.', 'Cửa sổ tàu hiện sông ánh sáng bạc.'],
      ['"All aboard the dream journey!" called the conductor.', '"Lên tàu hành trình mơ!" người soát vé gọi.'],
      ['Pillows were clouds and blankets were night sky.', 'Gối là mây và chăn là bầu trời đêm.'],
      ['Everyone felt safe, calm, and ready to sleep.', 'Mọi người thấy an toàn, yên và sẵn sàng ngủ.'],
      ['The midnight train whispered gentle goodnight songs.', 'Chuyến tàu nửa đêm thì thầm bài hát chúc ngủ ngon.'],
      ['In Dreamland every child found a happy dream.', 'Ở Xứ Mơ mỗi bạn tìm thấy một giấc mơ vui.'],
    ],
  }),
  story({
    id: 'premium-sams-starlight-submarine',
    title_en: "Sam's Starlight Submarine",
    title_vi: 'Tàu Ngầm Ánh Sao Của Sam',
    topics: ['Adventure', 'Ocean', 'Science'],
    coverFile: "35. Sam's Starlight Submarine.png",
    vocab: [
      { word: 'submarine', vi: 'tàu ngầm' },
      { word: 'starlight', vi: 'ánh sao' },
      { word: 'deep', vi: 'sâu' },
      { word: 'ocean', vi: 'đại dương' },
      { word: 'explore', vi: 'khám phá' },
      { word: 'window', vi: 'cửa sổ' },
      { word: 'glow', vi: 'phát sáng' },
      { word: 'discover', vi: 'khám phá ra' },
    ],
    sentences: [
      ['Sam steered a starlight submarine into the deep ocean.', 'Sam lái tàu ngầm ánh sao vào đại dương sâu.'],
      ['Through the window he saw glowing sea plants.', 'Qua cửa sổ cậu thấy cây biển phát sáng.'],
      ['"Let us explore!" Sam said with bright eyes.', '"Mình khám phá nào!" Sam nói với mắt sáng.'],
      ['Fish with silver scales swam beside the submarine.', 'Cá vảy bạc bơi cạnh tàu ngầm.'],
      ['Sam discovered a cave full of soft blue light.', 'Sam khám phá hang đầy ánh xanh dịu.'],
      ['He took photos for his science journal at school.', 'Cậu chụp ảnh cho sổ khoa học ở trường.'],
      ['The starlight submarine turned safely toward home.', 'Tàu ngầm ánh sao quay an toàn về nhà.'],
      ['"The ocean is full of wonder," Sam wrote that night.', '"Đại dương đầy điều kỳ diệu," Sam viết đêm đó.'],
    ],
  }),
  story({
    id: 'premium-the-enchanted-forest-bakery',
    title_en: 'The Enchanted Forest Bakery',
    title_vi: 'Tiệm Bánh Khu Rừng Phép Thuật',
    topics: ['Food', 'Fantasy', 'Friendship'],
    coverFile: '36. The Enchanted Forest Bakery.png',
    vocab: [
      { word: 'bakery', vi: 'tiệm bánh' },
      { word: 'enchanted', vi: 'phép thuật' },
      { word: 'forest', vi: 'rừng' },
      { word: 'bread', vi: 'bánh mì' },
      { word: 'sweet', vi: 'ngọt' },
      { word: 'bake', vi: 'nướng' },
      { word: 'share', vi: 'chia sẻ' },
      { word: 'warm', vi: 'ấm' },
    ],
    sentences: [
      ['Deep in the forest stood an enchanted bakery.', 'Sâu trong rừng có tiệm bánh phép thuật.'],
      ['Warm sweet bread filled the air with happy smells.', 'Bánh mì ngọt ấm làm không khí thơm vui.'],
      ['Animals came to bake cookies with tiny aprons.', 'Thú rừng đến nướng bánh quy với tạp dề nhỏ.'],
      ['"Please share the warm bread," said the baker fox.', '"Hãy chia sẻ bánh ấm," cáo thợ bánh nói.'],
      ['Children tasted star-shaped cakes and laughed.', 'Trẻ em nếm bánh hình sao và cười.'],
      ['Everyone helped clean bowls and wash spoons.', 'Mọi người giúp rửa bát và thìa.'],
      ['The enchanted forest bakery glowed with kindness.', 'Tiệm bánh rừng phép thuật sáng lên vì tử tế.'],
      ['"Food tastes better when we share," they all agreed.', '"Đồ ăn ngon hơn khi mình chia sẻ," tất cả đồng ý.'],
    ],
  }),
  story({
    id: 'premium-bella-and-the-butterfly-princess',
    title_en: 'Bella and the Butterfly Princess',
    title_vi: 'Bella và Công Chúa Bướm',
    topics: ['Fantasy', 'Nature', 'Friendship'],
    coverFile: '37. Bella and the Butterfly Princess.png',
    vocab: [
      { word: 'butterfly', vi: 'bướm' },
      { word: 'princess', vi: 'công chúa' },
      { word: 'wing', vi: 'cánh' },
      { word: 'garden', vi: 'khu vườn' },
      { word: 'kind', vi: 'tốt bụng' },
      { word: 'flower', vi: 'hoa' },
      { word: 'fly', vi: 'bay' },
      { word: 'friend', vi: 'bạn' },
    ],
    sentences: [
      ['Bella met a butterfly princess in a flower garden.', 'Bella gặp công chúa bướm trong vườn hoa.'],
      ['Her wings shone with pink and gold light.', 'Cánh nàng tỏa ánh hồng và vàng.'],
      ['"Will you be my kind friend?" asked the princess.', '"Cậu làm bạn tốt của tớ nhé?" công chúa hỏi.'],
      ['Bella nodded and danced among the flowers.', 'Bella gật đầu và nhảy giữa hoa.'],
      ['Together they helped a lost caterpillar find home.', 'Họ cùng giúp sâu bướm lạc tìm về nhà.'],
      ['The butterfly princess taught Bella to notice small beauty.', 'Công chúa bướm dạy Bella để ý vẻ đẹp nhỏ.'],
      ['Bella promised to care for every garden she saw.', 'Bella hứa sẽ chăm sóc mọi khu vườn cô thấy.'],
      ['"Kind hearts make the best wings," said the princess.', '"Trái tim tốt bụng tạo đôi cánh tuyệt nhất," công chúa nói.'],
    ],
  }),
];

function findLogoFile(coverFile) {
  const exact = path.join(LOGOS_DIR, coverFile);
  try {
    readFileSync(exact);
    return exact;
  } catch {
    const want = coverFile.toLowerCase();
    const hit = readdirSync(LOGOS_DIR).find((f) => f.toLowerCase() === want || f.toLowerCase().includes(want.replace(/^\d+\.\s*/, '').replace(/\.png$/i, '')));
    if (!hit) throw new Error(`Cover not found: ${coverFile} in ${LOGOS_DIR}`);
    return path.join(LOGOS_DIR, hit);
  }
}

function mimeAndExt(filePath) {
  const buf = readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg', bytes: buf };
  if (buf[0] === 0x89 && buf[1] === 0x50) return { mime: 'image/png', ext: 'png', bytes: buf };
  return { mime: 'image/png', ext: 'png', bytes: buf };
}

async function uploadCover(supabase, storyId, filePath) {
  const { mime, ext, bytes } = mimeAndExt(filePath);
  const objectKey = `${storyId}/cover-${randomUUID()}.${ext}`;
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, bytes, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${storyId}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(objectKey).data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | dir: ${LOGOS_DIR} | stories: ${STORIES.length}`);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let ok = 0;
  for (const s of STORIES) {
    const logoPath = findLogoFile(s.coverFile);
    console.log(`\n• ${s.id}`);
    console.log(`  ${s.title_en} / ${s.title_vi}`);
    console.log(`  cover: ${path.basename(logoPath)}`);
    if (!APPLY) {
      ok += 1;
      continue;
    }

    const coverUrl = await uploadCover(supabase, s.id, logoPath);
    const panels = buildPanels(s.sentences, coverUrl, s.vocabulary);
    const games = buildGames(s.vocabulary, panels);
    const row = {
      id: s.id,
      title_en: s.title_en,
      title_vi: s.title_vi,
      level: s.level,
      topics: s.topics,
      cover_image: coverUrl,
      estimated_minutes: s.estimated_minutes,
      published: true,
      premium_only: true,
      curriculum_stage_id: s.curriculum_stage_id,
      panels,
      vocabulary: s.vocabulary,
      games,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('stories').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error(`  FAIL: ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    console.log(`  upserted panels=${panels.length}`);
    ok += 1;
  }

  console.log(`\nDone: ${ok}/${STORIES.length}${APPLY ? ' applied' : ' validated (dry-run)'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
