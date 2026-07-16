#!/usr/bin/env node
/**
 * Seed 16 premium bilingual kids stories from story_logos/ covers.
 *
 * Usage:
 *   node scripts/seed-premium-story-logos.mjs           # dry-run
 *   node scripts/seed-premium-story-logos.mjs --apply  # upload + upsert
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
const LOGOS_DIR = path.join(ROOT, 'story_logos');

function tokenize(sentence, vocab = []) {
  const map = new Map(vocab.map((v) => [v.word.toLowerCase(), v.vi]));
  const parts = sentence.split(/(\s+|(?=[.,!?])|(?<=[.,!?]))/).filter((p) => p.length);
  return parts.map((display) => {
    const clean = display.replace(/[.,!?]/g, '').toLowerCase();
    if (!clean.trim()) {
      return { display, norm: '', lemma: '' };
    }
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

function story({
  id,
  title_en,
  title_vi,
  level = 'Beginner',
  topics,
  coverFile,
  estimated_minutes = 4,
  vocab,
  sentences,
}) {
  return {
    id,
    title_en,
    title_vi,
    level,
    topics,
    coverFile,
    estimated_minutes,
    published: true,
    premium_only: true,
    curriculum_stage_id: 'a2-key',
    vocabulary: vocab.map((v) => ({ word: v.word, vi: v.vi, ipa: v.ipa || '' })),
    sentences,
  };
}

/** @type {Array<ReturnType<typeof story>>} */
const STORIES = [
  story({
    id: 'premium-benny-and-the-blue-balloon',
    title_en: 'Benny and the Blue Balloon',
    title_vi: 'Benny và Quả Bóng Bay Xanh',
    topics: ['Animals', 'Adventure', 'Friendship'],
    coverFile: 'Benny and the Blue Balloon.png',
    vocab: [
      { word: 'balloon', vi: 'bóng bay' },
      { word: 'sky', vi: 'bầu trời' },
      { word: 'float', vi: 'bay lên' },
      { word: 'brave', vi: 'dũng cảm' },
      { word: 'hold', vi: 'cầm' },
      { word: 'village', vi: 'ngôi làng' },
      { word: 'smile', vi: 'nụ cười' },
      { word: 'friend', vi: 'bạn' },
    ],
    sentences: [
      ['Benny the little bear found a shiny blue balloon.', 'Chú gấu nhỏ Benny tìm thấy một quả bóng bay xanh óng ánh.'],
      ['"Hello, balloon!" said Benny. "Will you float with me?"', '"Xin chào, bóng bay!" Benny nói. "Cậu sẽ bay cùng tớ chứ?"'],
      ['Benny held the string and felt the balloon pull up.', 'Benny cầm sợi dây và cảm thấy bóng bay kéo nhẹ lên.'],
      ['They floated over green hills and a small village.', 'Họ bay qua đồi xanh và một ngôi làng nhỏ.'],
      ['The wind was strong, but Benny was brave.', 'Gió rất mạnh, nhưng Benny rất dũng cảm.'],
      ['A bird waved hello from the bright blue sky.', 'Một chú chim vẫy chào từ bầu trời xanh sáng.'],
      ['Benny shared his balloon with a new friend below.', 'Benny chia sẻ bóng bay với một người bạn mới ở dưới.'],
      ['They smiled together. "Best adventure ever!" said Benny.', 'Họ cùng mỉm cười. "Cuộc phiêu lưu tuyệt nhất!" Benny nói.'],
    ],
  }),
  story({
    id: 'premium-lunas-lost-little-star',
    title_en: "Luna's Lost Little Star",
    title_vi: 'Ngôi Sao Bé Lạc Của Luna',
    topics: ['Adventure', 'Emotions', 'Nature'],
    coverFile: "Luna’s Lost Little Star.png",
    vocab: [
      { word: 'star', vi: 'ngôi sao' },
      { word: 'night', vi: 'đêm' },
      { word: 'moon', vi: 'mặt trăng' },
      { word: 'search', vi: 'tìm kiếm' },
      { word: 'gentle', vi: 'dịu dàng' },
      { word: 'sparkle', vi: 'lấp lánh' },
      { word: 'path', vi: 'con đường' },
      { word: 'home', vi: 'nhà' },
    ],
    sentences: [
      ['Luna looked up and saw a little star fall from the sky.', 'Luna ngước lên và thấy một ngôi sao bé rơi từ bầu trời.'],
      ['"Oh no! My little star is lost," whispered Luna.', '"Ôi không! Ngôi sao bé của mình bị lạc rồi," Luna thì thầm.'],
      ['She walked a gentle path under the soft night moon.', 'Cô đi trên con đường êm ái dưới ánh trăng ban đêm.'],
      ['Luna searched behind trees and under shiny leaves.', 'Luna tìm phía sau cây và dưới những chiếc lá sáng.'],
      ['A firefly helped her: "Follow the sparkle!"', 'Một đom đóm giúp cô: "Hãy theo ánh lấp lánh!"'],
      ['They found the little star resting on a quiet hill.', 'Họ tìm thấy ngôi sao bé đang nghỉ trên ngọn đồi yên tĩnh.'],
      ['Luna held it close and said, "You are safe now."', 'Luna ôm sao vào lòng và nói, "Bây giờ bạn an toàn rồi."'],
      ['The star sparkled home in the sky. Luna smiled at night.', 'Ngôi sao lấp lánh bay về nhà trên trời. Luna mỉm cười trong đêm.'],
    ],
  }),
  story({
    id: 'premium-milo-and-the-magic-backpack',
    title_en: 'Milo and the Magic Backpack',
    title_vi: 'Milo và Chiếc Ba Lô Kỳ Diệu',
    topics: ['Adventure', 'School', 'Fantasy'],
    coverFile: 'Milo and the Magic Backpack.png',
    vocab: [
      { word: 'backpack', vi: 'ba lô' },
      { word: 'magic', vi: 'kỳ diệu' },
      { word: 'book', vi: 'sách' },
      { word: 'map', vi: 'bản đồ' },
      { word: 'help', vi: 'giúp đỡ' },
      { word: 'share', vi: 'chia sẻ' },
      { word: 'surprise', vi: 'bất ngờ' },
      { word: 'kind', vi: 'tử tế' },
    ],
    sentences: [
      ['Milo found a magic backpack near the school gate.', 'Milo tìm thấy một chiếc ba lô kỳ diệu gần cổng trường.'],
      ['Inside the backpack was a glowing little map.', 'Bên trong ba lô có một tấm bản đồ nhỏ phát sáng.'],
      ['The map said, "Help a friend, and magic will grow!"', 'Bản đồ viết: "Giúp một người bạn, phép màu sẽ lớn lên!"'],
      ['Milo shared his book with a shy new student.', 'Milo chia sẻ sách với bạn học mới hơi nhút nhát.'],
      ['Pop! The backpack gave him a golden pencil.', 'Bụp! Ba lô tặng cậu một cây bút chì vàng.'],
      ['Next, Milo helped carry heavy bags for a teacher.', 'Tiếp theo, Milo giúp cô giáo xách túi nặng.'],
      ['The backpack filled with stickers and a happy surprise.', 'Ba lô đầy sticker và một bất ngờ vui vẻ.'],
      ['"Being kind is the best magic," said Milo with a smile.', '"Tử tế là phép màu tuyệt nhất," Milo mỉm cười nói.'],
    ],
  }),
  story({
    id: 'premium-the-brave-tiny-turtle',
    title_en: 'The Brave Tiny Turtle',
    title_vi: 'Chú Rùa Bé Dũng Cảm',
    topics: ['Animals', 'Nature', 'Emotions'],
    coverFile: 'The Brave Tiny Turtle.png',
    vocab: [
      { word: 'turtle', vi: 'rùa' },
      { word: 'ocean', vi: 'đại dương' },
      { word: 'wave', vi: 'sóng' },
      { word: 'slow', vi: 'chậm' },
      { word: 'brave', vi: 'dũng cảm' },
      { word: 'shell', vi: 'mai rùa' },
      { word: 'swim', vi: 'bơi' },
      { word: 'cheer', vi: 'cổ vũ' },
    ],
    sentences: [
      ['A tiny turtle stood by the big blue ocean.', 'Một chú rùa bé đứng bên đại dương xanh lớn.'],
      ['The waves looked tall, and the turtle felt small.', 'Những con sóng trông cao, và rùa cảm thấy nhỏ bé.'],
      ['"I am slow, but I am brave," said the turtle.', '"Tớ chậm, nhưng tớ dũng cảm," rùa nói.'],
      ['Step by step, the turtle walked into the soft water.', 'Từng bước một, rùa đi vào làn nước êm.'],
      ['Fish friends swam near and began to cheer.', 'Những người bạn cá bơi tới và cổ vũ.'],
      ['The turtle tucked into its shell when a big wave came.', 'Rùa rụt vào mai khi một con sóng lớn ập tới.'],
      ['Then the turtle swam out and kept going.', 'Rồi rùa bơi ra và tiếp tục đi.'],
      ['"I did it!" laughed the brave tiny turtle.', '"Tớ làm được rồi!" chú rùa bé dũng cảm cười.'],
    ],
  }),
  story({
    id: 'premium-the-moonlight-cookie-shop',
    title_en: 'The Moonlight Cookie Shop',
    title_vi: 'Tiệm Bánh Quy Ánh Trăng',
    topics: ['Food', 'Family', 'Fantasy'],
    coverFile: '6. The Moonlight Cookie Shop.png',
    vocab: [
      { word: 'cookie', vi: 'bánh quy' },
      { word: 'shop', vi: 'cửa hàng' },
      { word: 'bake', vi: 'nướng' },
      { word: 'sweet', vi: 'ngọt' },
      { word: 'moonlight', vi: 'ánh trăng' },
      { word: 'share', vi: 'chia sẻ' },
      { word: 'warm', vi: 'ấm áp' },
      { word: 'smell', vi: 'mùi hương' },
    ],
    sentences: [
      ['At night, the moonlight cookie shop opened its door.', 'Ban đêm, tiệm bánh quy ánh trăng mở cửa.'],
      ['Little chefs baked sweet cookies under soft lights.', 'Những đầu bếp nhỏ nướng bánh quy ngọt dưới ánh đèn êm.'],
      ['The warm smell floated into the quiet street.', 'Mùi ấm áp lan ra con phố yên tĩnh.'],
      ['"Would you like a moon cookie?" asked the baker.', '"Bạn muốn một chiếc bánh trăng không?" thợ bánh hỏi.'],
      ['Children shared cookies and laughed together.', 'Các bạn nhỏ chia sẻ bánh và cùng cười.'],
      ['Each cookie had a tiny star of sugar on top.', 'Mỗi chiếc bánh có một ngôi sao đường nhỏ ở trên.'],
      ['The shop glowed like a friendly lantern.', 'Tiệm sáng như một chiếc đèn lồng thân thiện.'],
      ['"Sweet night, sweet friends," whispered the baker.', '"Đêm ngọt ngào, bạn bè ngọt ngào," thợ bánh thì thầm.'],
    ],
  }),
  story({
    id: 'premium-oliver-and-the-friendly-dragon',
    title_en: 'Oliver and the Friendly Dragon',
    title_vi: 'Oliver và Chú Rồng Thân Thiện',
    topics: ['Fantasy', 'Friendship', 'Adventure'],
    coverFile: '7. Oliver and the Friendly Dragon.png',
    level: 'Elementary',
    vocab: [
      { word: 'dragon', vi: 'rồng' },
      { word: 'friendly', vi: 'thân thiện' },
      { word: 'cave', vi: 'hang động' },
      { word: 'fly', vi: 'bay' },
      { word: 'scare', vi: 'làm sợ' },
      { word: 'hug', vi: 'ôm' },
      { word: 'fire', vi: 'lửa' },
      { word: 'together', vi: 'cùng nhau' },
    ],
    sentences: [
      ['Oliver found a friendly dragon in a green cave.', 'Oliver tìm thấy một chú rồng thân thiện trong hang xanh.'],
      ['The dragon did not want to scare anyone.', 'Chú rồng không muốn làm ai sợ cả.'],
      ['"I only make tiny warm fire for tea," said the dragon.', '"Tớ chỉ tạo lửa ấm nhỏ để pha trà," rồng nói.'],
      ['Oliver smiled and shared his apple with the dragon.', 'Oliver mỉm cười và chia sẻ táo với rồng.'],
      ['They flew over soft clouds together.', 'Họ cùng bay trên những đám mây êm.'],
      ['Kids below waved, "Hello, friendly dragon!"', 'Các bạn nhỏ bên dưới vẫy: "Xin chào, rồng thân thiện!"'],
      ['Oliver gave the dragon a big hug.', 'Oliver ôm rồng một cái thật chặt.'],
      ['"Best friends forever," they said together.', '"Bạn thân mãi mãi," họ cùng nói.'],
    ],
  }),
  story({
    id: 'premium-daisys-dancing-shoes',
    title_en: "Daisy's Dancing Shoes",
    title_vi: 'Đôi Giày Khiêu Vũ Của Daisy',
    topics: ['Sports', 'Emotions', 'Daily Life'],
    coverFile: "8. Daisy's Dancing Shoes.png",
    vocab: [
      { word: 'dance', vi: 'nhảy múa' },
      { word: 'shoes', vi: 'giày' },
      { word: 'music', vi: 'âm nhạc' },
      { word: 'spin', vi: 'xoay tròn' },
      { word: 'stage', vi: 'sân khấu' },
      { word: 'clap', vi: 'vỗ tay' },
      { word: 'happy', vi: 'vui vẻ' },
      { word: 'practice', vi: 'luyện tập' },
    ],
    sentences: [
      ['Daisy put on her shiny dancing shoes.', 'Daisy xỏ đôi giày khiêu vũ bóng loáng.'],
      ['Soft music began to play in the room.', 'Âm nhạc êm ái bắt đầu vang trong phòng.'],
      ['Daisy practiced a spin, then another spin.', 'Daisy luyện một vòng xoay, rồi một vòng nữa.'],
      ['Sometimes she fell, but she stood up happy.', 'Đôi khi cô ngã, nhưng cô đứng dậy vẫn vui.'],
      ['On the stage, Daisy danced with a bright smile.', 'Trên sân khấu, Daisy nhảy với nụ cười rạng rỡ.'],
      ['Friends began to clap for her brave dance.', 'Bạn bè vỗ tay cho điệu nhảy dũng cảm của cô.'],
      ['Her shoes felt light, like little wings.', 'Đôi giày cảm giác nhẹ như đôi cánh nhỏ.'],
      ['"I love to dance!" laughed Daisy.', '"Mình thích nhảy múa!" Daisy cười.'],
    ],
  }),
  story({
    id: 'premium-the-secret-treehouse-club',
    title_en: 'The Secret Treehouse Club',
    title_vi: 'Câu Lạc Bộ Nhà Trên Cây Bí Mật',
    topics: ['Friendship', 'Adventure', 'Nature'],
    coverFile: '9. The Secret Treehouse Club.png',
    vocab: [
      { word: 'treehouse', vi: 'nhà trên cây' },
      { word: 'secret', vi: 'bí mật' },
      { word: 'club', vi: 'câu lạc bộ' },
      { word: 'ladder', vi: 'thang' },
      { word: 'password', vi: 'mật khẩu' },
      { word: 'team', vi: 'đội nhóm' },
      { word: 'plan', vi: 'kế hoạch' },
      { word: 'invite', vi: 'mời' },
    ],
    sentences: [
      ['Four friends built a secret treehouse club.', 'Bốn người bạn dựng một câu lạc bộ nhà trên cây bí mật.'],
      ['They climbed the wooden ladder carefully.', 'Họ trèo thang gỗ một cách cẩn thận.'],
      ['The password was "Kind kids only!"', 'Mật khẩu là "Chỉ các bạn tốt bụng!"'],
      ['In the treehouse, they made a fun team plan.', 'Trong nhà trên cây, họ lập kế hoạch nhóm vui.'],
      ['They decided to invite one more kind friend.', 'Họ quyết định mời thêm một người bạn tốt bụng.'],
      ['Together they read books and shared snacks.', 'Họ cùng đọc sách và chia sẻ đồ ăn vặt.'],
      ['Birds sang near the secret treehouse club.', 'Chim hót gần câu lạc bộ nhà trên cây bí mật.'],
      ['"Our club is strong because we care," they said.', '"Câu lạc bộ mạnh vì chúng ta quan tâm nhau," họ nói.'],
    ],
  }),
  story({
    id: 'premium-finn-and-the-talking-fish',
    title_en: 'Finn and the Talking Fish',
    title_vi: 'Finn và Chú Cá Biết Nói',
    topics: ['Animals', 'Adventure', 'Nature'],
    coverFile: '10. Finn and the Talking Fish.png',
    vocab: [
      { word: 'fish', vi: 'cá' },
      { word: 'talk', vi: 'nói chuyện' },
      { word: 'river', vi: 'dòng sông' },
      { word: 'listen', vi: 'lắng nghe' },
      { word: 'clean', vi: 'sạch' },
      { word: 'splash', vi: 'té nước' },
      { word: 'promise', vi: 'lời hứa' },
      { word: 'protect', vi: 'bảo vệ' },
    ],
    sentences: [
      ['Finn sat by the river and heard a soft splash.', 'Finn ngồi bên sông và nghe tiếng té nước nhẹ.'],
      ['A bright fish popped up and said, "Hello, Finn!"', 'Một chú cá sáng màu nhảy lên và nói, "Xin chào, Finn!"'],
      ['Finn blinked. "You can talk?" he asked.', 'Finn chớp mắt. "Cậu biết nói sao?" cậu hỏi.'],
      ['"Yes! Please help keep our river clean," said the fish.', '"Đúng! Làm ơn giúp giữ sông sạch nhé," cá nói.'],
      ['Finn picked up trash and put it in a bag.', 'Finn nhặt rác và bỏ vào túi.'],
      ['The fish danced a happy splash dance.', 'Chú cá nhảy điệu splash vui vẻ.'],
      ['Finn made a promise to protect the river.', 'Finn hứa sẽ bảo vệ dòng sông.'],
      ['"Thank you, friend," said the talking fish.', '"Cảm ơn bạn," chú cá biết nói bảo.'],
    ],
  }),
  story({
    id: 'premium-mias-wonderful-word-box',
    title_en: "Mia's Wonderful Word Box",
    title_vi: 'Hộp Từ Kỳ Diệu Của Mia',
    topics: ['School', 'Daily Life', 'Emotions'],
    coverFile: "11. Mia's Wonderful Word Box.png",
    vocab: [
      { word: 'word', vi: 'từ' },
      { word: 'box', vi: 'hộp' },
      { word: 'learn', vi: 'học' },
      { word: 'open', vi: 'mở' },
      { word: 'sparkle', vi: 'lấp lánh' },
      { word: 'sentence', vi: 'câu' },
      { word: 'practice', vi: 'luyện tập' },
      { word: 'proud', vi: 'tự hào' },
    ],
    sentences: [
      ['Mia had a wonderful word box on her desk.', 'Mia có một hộp từ kỳ diệu trên bàn.'],
      ['She opened the box and saw sparkle cards.', 'Cô mở hộp và thấy những thẻ lấp lánh.'],
      ['Each card had a new English word to learn.', 'Mỗi thẻ có một từ tiếng Anh mới để học.'],
      ['Mia said "hello," then "happy," then "friend."', 'Mia nói "hello," rồi "happy," rồi "friend."'],
      ['She built a short sentence with three words.', 'Cô ghép một câu ngắn với ba từ.'],
      ['Every day she practiced one more word.', 'Mỗi ngày cô luyện thêm một từ.'],
      ['Her brother listened and clapped proudly.', 'Anh trai lắng nghe và vỗ tay tự hào.'],
      ['"Words help me share my feelings," said Mia.', '"Từ giúp mình chia sẻ cảm xúc," Mia nói.'],
    ],
  }),
  story({
    id: 'premium-rubys-robot-friend',
    title_en: "Ruby's Robot Friend",
    title_vi: 'Người Bạn Robot Của Ruby',
    topics: ['Friendship', 'Fantasy', 'School'],
    coverFile: "14. Ruby's Robot Friend.png",
    vocab: [
      { word: 'robot', vi: 'robot' },
      { word: 'button', vi: 'nút bấm' },
      { word: 'beep', vi: 'tiếng bip' },
      { word: 'help', vi: 'giúp' },
      { word: 'fix', vi: 'sửa' },
      { word: 'smile', vi: 'cười' },
      { word: 'team', vi: 'đội' },
      { word: 'clever', vi: 'thông minh' },
    ],
    sentences: [
      ['Ruby built a small robot friend in her room.', 'Ruby lắp một người bạn robot nhỏ trong phòng.'],
      ['She pressed a blue button. Beep! Beep!', 'Cô nhấn nút xanh. Bíp! Bíp!'],
      ['The robot said, "Hello, Ruby. I can help!"', 'Robot nói, "Xin chào, Ruby. Tớ có thể giúp!"'],
      ['Together they cleaned toys and sorted books.', 'Họ cùng dọn đồ chơi và xếp sách.'],
      ['One day the robot stopped. Ruby helped fix it.', 'Một ngày robot dừng lại. Ruby giúp sửa.'],
      ['"You are clever and kind," beeped the robot.', '"Cậu thông minh và tốt bụng," robot bip.'],
      ['Ruby and the robot became a great team.', 'Ruby và robot trở thành một đội tuyệt vời.'],
      ['They smiled and planned a new fun project.', 'Họ mỉm cười và lên kế hoạch dự án vui mới.'],
    ],
  }),
  story({
    id: 'premium-the-little-fox-who-loved-english',
    title_en: 'The Little Fox Who Loved English',
    title_vi: 'Chú Cáo Nhỏ Yêu Tiếng Anh',
    topics: ['Animals', 'School', 'Friendship'],
    coverFile: '15. The Little Fox Who Loved English.png',
    vocab: [
      { word: 'fox', vi: 'cáo' },
      { word: 'English', vi: 'tiếng Anh' },
      { word: 'read', vi: 'đọc' },
      { word: 'speak', vi: 'nói' },
      { word: 'forest', vi: 'rừng' },
      { word: 'lesson', vi: 'bài học' },
      { word: 'practice', vi: 'luyện' },
      { word: 'cheer', vi: 'cổ vũ' },
    ],
    sentences: [
      ['In a green forest lived a little fox who loved English.', 'Trong khu rừng xanh sống một chú cáo nhỏ yêu tiếng Anh.'],
      ['Every morning the fox read a simple English book.', 'Mỗi sáng cáo đọc một cuốn sách tiếng Anh đơn giản.'],
      ['"Hello, tree! Hello, bird!" the fox liked to speak.', '"Hello, tree! Hello, bird!" cáo thích nói.'],
      ['Animal friends came for a short English lesson.', 'Bạn bè động vật đến học một bài tiếng Anh ngắn.'],
      ['They practiced colors: red, blue, and green.', 'Họ luyện màu: red, blue, và green.'],
      ['The fox cheered when friends said new words.', 'Cáo cổ vũ khi bạn bè nói từ mới.'],
      ['Soon the forest could say "Thank you" and "Please."', 'Chẳng bao lâu cả rừng biết nói "Thank you" và "Please."'],
      ['"English is fun when we learn together," said the fox.', '"Tiếng Anh vui khi mình học cùng nhau," cáo nói.'],
    ],
  }),
  story({
    id: 'premium-max-and-the-time-traveling-clock',
    title_en: 'Max and the Time-Traveling Clock',
    title_vi: 'Max và Chiếc Đồng Hồ Du Hành Thời Gian',
    topics: ['Adventure', 'Fantasy', 'Daily Life'],
    coverFile: '16. Max and the Time-Traveling Clock.png',
    level: 'Elementary',
    vocab: [
      { word: 'clock', vi: 'đồng hồ' },
      { word: 'time', vi: 'thời gian' },
      { word: 'travel', vi: 'du hành' },
      { word: 'past', vi: 'quá khứ' },
      { word: 'future', vi: 'tương lai' },
      { word: 'tick', vi: 'tích tắc' },
      { word: 'careful', vi: 'cẩn thận' },
      { word: 'home', vi: 'nhà' },
    ],
    sentences: [
      ['Max found an old clock that could travel through time.', 'Max tìm thấy chiếc đồng hồ cũ có thể du hành thời gian.'],
      ['Tick, tock! The clock glowed with soft light.', 'Tích tắc! Đồng hồ phát sáng dịu.'],
      ['Max visited a gentle past day with his grandma.', 'Max ghé một ngày quá khứ dịu dàng với bà.'],
      ['Then he peeked at a bright future garden.', 'Rồi cậu nhìn thoáng khu vườn tương lai rực rỡ.'],
      ['"Be careful with time," whispered the clock.', '"Hãy cẩn thận với thời gian," đồng hồ thì thầm.'],
      ['Max learned to enjoy each minute at home.', 'Max học cách tận hưởng từng phút ở nhà.'],
      ['He said thank you to family and friends today.', 'Cậu nói cảm ơn gia đình và bạn bè hôm nay.'],
      ['The clock smiled: "Now is a wonderful time."', 'Đồng hồ mỉm cười: "Hiện tại là thời gian tuyệt vời."'],
    ],
  }),
  story({
    id: 'premium-sophies-space-school',
    title_en: "Sophie's Space School",
    title_vi: 'Trường Học Không Gian Của Sophie',
    topics: ['School', 'Adventure', 'Fantasy'],
    coverFile: "17. Sophie's Space School.png",
    level: 'Elementary',
    vocab: [
      { word: 'space', vi: 'không gian' },
      { word: 'school', vi: 'trường học' },
      { word: 'planet', vi: 'hành tinh' },
      { word: 'rocket', vi: 'tên lửa' },
      { word: 'star', vi: 'ngôi sao' },
      { word: 'class', vi: 'lớp học' },
      { word: 'helmet', vi: 'mũ bảo hiểm' },
      { word: 'learn', vi: 'học' },
    ],
    sentences: [
      ['Sophie went to space school in a shiny rocket.', 'Sophie đến trường không gian bằng tên lửa sáng bóng.'],
      ['She wore a soft white helmet for class.', 'Cô đội mũ bảo hiểm trắng mềm cho lớp học.'],
      ['Today the lesson was about colorful planets.', 'Hôm nay bài học về các hành tinh đầy màu sắc.'],
      ['Sophie counted stars and wrote new English words.', 'Sophie đếm sao và viết từ tiếng Anh mới.'],
      ['Her teacher said, "Great job, space explorer!"', 'Cô giáo nói, "Làm tốt lắm, nhà thám hiểm vũ trụ!"'],
      ['Friends floated and learned numbers together.', 'Bạn bè lơ lửng và cùng học số.'],
      ['Sophie shared snacks that looked like little moons.', 'Sophie chia sẻ đồ ăn trông như mặt trăng nhỏ.'],
      ['"Space school is the coolest school!" she laughed.', '"Trường không gian là trường ngầu nhất!" cô cười.'],
    ],
  }),
  story({
    id: 'premium-the-mystery-of-the-missing-moon',
    title_en: 'The Mystery of the Missing Moon',
    title_vi: 'Bí Ẩn Mặt Trăng Biến Mất',
    topics: ['Adventure', 'Nature', 'Friendship'],
    coverFile: '18. The Mystery of the Missing Moon.png',
    level: 'Elementary',
    vocab: [
      { word: 'mystery', vi: 'bí ẩn' },
      { word: 'missing', vi: 'biến mất' },
      { word: 'moon', vi: 'mặt trăng' },
      { word: 'clue', vi: 'manh mối' },
      { word: 'night', vi: 'đêm' },
      { word: 'find', vi: 'tìm thấy' },
      { word: 'cloud', vi: 'đám mây' },
      { word: 'bright', vi: 'sáng' },
    ],
    sentences: [
      ['One night, the bright moon was missing from the sky.', 'Một đêm, mặt trăng sáng biến mất khỏi bầu trời.'],
      ['Kids became detectives of a gentle mystery.', 'Các bạn nhỏ trở thành thám tử của một bí ẩn dịu dàng.'],
      ['They found a fluffy clue: a soft white cloud.', 'Họ tìm thấy manh mối bông: một đám mây trắng mềm.'],
      ['Behind the cloud, something glowed quietly.', 'Phía sau đám mây, có thứ gì đó phát sáng khẽ.'],
      ['"The moon is hiding and resting!" they cheered.', '"Mặt trăng đang trốn và nghỉ ngơi!" họ reo.'],
      ['They sang a soft song to welcome the moon back.', 'Họ hát khẽ để chào mặt trăng trở lại.'],
      ['The moon peeked out, bright and happy again.', 'Mặt trăng ló ra, sáng và vui trở lại.'],
      ['"Mystery solved with kindness," said the kids.', '"Bí ẩn được giải bằng sự tử tế," các bạn nói.'],
    ],
  }),
  story({
    id: 'premium-emmas-amazing-animal-train',
    title_en: "Emma's Amazing Animal Train",
    title_vi: 'Chuyến Tàu Động Vật Kỳ Diệu Của Emma',
    topics: ['Animals', 'Transportation', 'Friendship'],
    coverFile: "20. Emma's Amazing Animal Train.png",
    vocab: [
      { word: 'train', vi: 'tàu hỏa' },
      { word: 'animal', vi: 'động vật' },
      { word: 'ticket', vi: 'vé' },
      { word: 'station', vi: 'ga' },
      { word: 'ride', vi: 'đi' },
      { word: 'whistle', vi: 'còi' },
      { word: 'seat', vi: 'ghế' },
      { word: 'journey', vi: 'hành trình' },
    ],
    sentences: [
      ['Emma drove an amazing animal train from the station.', 'Emma lái chuyến tàu động vật kỳ diệu từ nhà ga.'],
      ['Animals lined up with colorful tickets.', 'Các loài vật xếp hàng với vé đủ màu.'],
      ['"All aboard!" Emma called with a happy whistle.', '"Lên tàu nào!" Emma gọi cùng tiếng còi vui.'],
      ['A rabbit found a soft seat by the window.', 'Một chú thỏ tìm ghế êm cạnh cửa sổ.'],
      ['A panda shared snacks on the fun ride.', 'Một chú gấu trúc chia sẻ đồ ăn trên chuyến đi vui.'],
      ['They passed green fields and blue rivers.', 'Họ đi qua đồng xanh và sông xanh.'],
      ['Everyone sang songs on the long journey.', 'Mọi người hát trên hành trình dài.'],
      ['"Best train ever!" cheered Emma and her animal friends.', '"Chuyến tàu tuyệt nhất!" Emma và bạn động vật reo lên.'],
    ],
  }),
];

function findLogoFile(coverFile) {
  const exact = path.join(LOGOS_DIR, coverFile);
  try {
    readFileSync(exact);
    return exact;
  } catch {
    // Fuzzy match by stripped name (handles curly apostrophe)
    const want = coverFile
      .normalize('NFKD')
      .replace(/[’']/g, "'")
      .toLowerCase();
    const files = readdirSync(LOGOS_DIR);
    const hit = files.find((f) => {
      const n = f.normalize('NFKD').replace(/[’']/g, "'").toLowerCase();
      return n === want || n.includes(want.replace(/\.png$/i, '')) || want.includes(n.replace(/\.png$/i, ''));
    });
    if (!hit) throw new Error(`Cover not found: ${coverFile}`);
    return path.join(LOGOS_DIR, hit);
  }
}

function mimeAndExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return { mime: 'image/png', ext: 'png' };
  if (ext === '.jpg' || ext === '.jpeg') return { mime: 'image/jpeg', ext: 'jpg' };
  // many "png" files are actually jpeg
  const buf = readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xd8) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf[0] === 0x89 && buf[1] === 0x50) return { mime: 'image/png', ext: 'png' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

async function uploadCover(supabase, storyId, filePath) {
  const bytes = readFileSync(filePath);
  const { mime, ext } = mimeAndExt(filePath);
  const objectKey = `${storyId}/cover-${randomUUID()}.${ext}`;
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});
  const { error } = await supabase.storage.from(BUCKET).upload(objectKey, bytes, {
    contentType: mime,
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${storyId}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  return data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | stories: ${STORIES.length}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let ok = 0;
  for (const s of STORIES) {
    const logoPath = findLogoFile(s.coverFile);
    console.log(`\n• ${s.id}`);
    console.log(`  title: ${s.title_en} / ${s.title_vi}`);
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
    console.log(`  upserted cover=${coverUrl.slice(0, 70)}... panels=${panels.length}`);
    ok += 1;
  }

  console.log(`\nDone: ${ok}/${STORIES.length}${APPLY ? ' applied' : ' validated (dry-run)'}`);
  if (!APPLY) {
    console.log('Re-run with --apply to upload covers and write to Supabase.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
