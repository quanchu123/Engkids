-- ============================================
-- SEED SAMPLE STORIES DATA
-- Thêm 5 truyện mẫu vào database
-- ============================================

INSERT INTO stories (id, title_en, title_vi, level, topics, cover_image, estimated_minutes, panels, vocabulary, games) VALUES

-- Story 1: The Little Red Hen
('little-red-hen', 'The Little Red Hen', 'Gà mái đỏ nhỏ', 'Beginner', ARRAY['animals', 'farm', 'work'], 
'https://picsum.photos/seed/hen/400/300', 
5,
'[
  {"image": "", "text_en": "Once upon a time, there was a Little Red Hen who lived on a farm.", "text_vi": "Ngày xửa ngày xưa, có một chú gà mái đỏ nhỏ sống trong trang trại."},
  {"image": "", "text_en": "One day, she found some wheat seeds. \"Who will help me plant these seeds?\" asked the Little Red Hen.", "text_vi": "Một ngày, cô tìm thấy hạt giống lúa mì. \"Ai sẽ giúp tôi trồng hạt này?\" gà mái hỏi."},
  {"image": "", "text_en": "\"Not I,\" said the cat. \"Not I,\" said the dog. \"Not I,\" said the duck.", "text_vi": "\"Không phải tôi,\" mèo nói. \"Không phải tôi,\" chó nói. \"Không phải tôi,\" vịt nói."},
  {"image": "", "text_en": "\"Then I will do it myself,\" said the Little Red Hen. And she did.", "text_vi": "\"Vậy tôi sẽ tự làm,\" gà mái nói. Và cô đã làm."},
  {"image": "", "text_en": "The wheat grew tall and golden. \"Who will help me cut the wheat?\" asked the Little Red Hen.", "text_vi": "Lúa mì mọc cao và vàng óng. \"Ai sẽ giúp tôi gặt lúa?\" gà mái hỏi."},
  {"image": "", "text_en": "\"Not I,\" said the cat. \"Not I,\" said the dog. \"Not I,\" said the duck.", "text_vi": "\"Không phải tôi,\" mèo nói. \"Không phải tôi,\" chó nói. \"Không phải tôi,\" vịt nói."},
  {"image": "", "text_en": "\"Then I will do it myself,\" said the Little Red Hen. And she did.", "text_vi": "\"Vậy tôi sẽ tự làm,\" gà mái nói. Và cô đã làm."},
  {"image": "", "text_en": "\"Who will help me make the flour?\" she asked. But no one would help.", "text_vi": "\"Ai sẽ giúp tôi làm bột?\" cô hỏi. Nhưng không ai giúp."},
  {"image": "", "text_en": "Finally, the Little Red Hen baked a beautiful loaf of bread.", "text_vi": "Cuối cùng, gà mái nướng một ổ bánh mì thơm ngon."},
  {"image": "", "text_en": "\"Who will help me eat this bread?\" asked the Little Red Hen.", "text_vi": "\"Ai sẽ giúp tôi ăn bánh mì này?\" gà mái hỏi."},
  {"image": "", "text_en": "\"I will!\" said the cat. \"I will!\" said the dog. \"I will!\" said the duck.", "text_vi": "\"Tôi!\" mèo nói. \"Tôi!\" chó nói. \"Tôi!\" vịt nói."},
  {"image": "", "text_en": "\"No,\" said the Little Red Hen. \"I planted the seeds. I cut the wheat. I made the flour. I baked the bread. Now I will eat it myself!\"", "text_vi": "\"Không,\" gà mái nói. \"Tôi đã trồng hạt. Tôi đã gặt lúa. Tôi đã làm bột. Tôi đã nướng bánh. Bây giờ tôi sẽ tự ăn!\""},
  {"image": "", "text_en": "And she did. The End.", "text_vi": "Và cô đã ăn. Hết."}
]'::jsonb,
'["wheat", "plant", "seeds", "farm", "bread", "flour"]'::jsonb,
'{"match": [], "fill_blank": []}'::jsonb),

-- Story 2: Three Little Pigs
('three-little-pigs', 'Three Little Pigs', 'Ba chú heo con', 'Beginner', ARRAY['animals', 'adventure', 'safety'],
'https://picsum.photos/seed/pigs/400/300',
6,
'[
  {"image": "", "text_en": "Once upon a time, there were three little pigs. They left home to build their own houses.", "text_vi": "Ngày xửa ngày xưa, có ba chú heo con rời nhà đi xây nhà riêng."},
  {"image": "", "text_en": "The first little pig built his house of straw. It was quick and easy.", "text_vi": "Chú heo thứ nhất xây nhà bằng rơm. Nhanh và dễ."},
  {"image": "", "text_en": "The second little pig built his house of sticks. It took a bit longer.", "text_vi": "Chú heo thứ hai xây nhà bằng que. Mất nhiều thời gian hơn."},
  {"image": "", "text_en": "The third little pig built his house of bricks. It took a long time, but it was very strong.", "text_vi": "Chú heo thứ ba xây nhà bằng gạch. Mất nhiều thời gian nhưng rất chắc."},
  {"image": "", "text_en": "One day, a big bad wolf came. He went to the straw house. \"Little pig, let me in!\" he said.", "text_vi": "Một ngày, con sói xấu xa đến. Nó đến nhà rơm. \"Heo con, cho tôi vào!\" nó nói."},
  {"image": "", "text_en": "\"Not by the hair on my chinny chin chin!\" said the first pig.", "text_vi": "\"Không được đâu!\" heo con đầu tiên nói."},
  {"image": "", "text_en": "\"Then I will huff and I will puff and I will blow your house down!\" And the wolf blew the house down.", "text_vi": "\"Vậy tôi sẽ thổi bay nhà của mi!\" Và sói thổi bay nhà rơm."},
  {"image": "", "text_en": "The first pig ran to his brother''s stick house. But the wolf blew that down too!", "text_vi": "Heo con chạy đến nhà que của anh. Nhưng sói cũng thổi bay!"},
  {"image": "", "text_en": "Both pigs ran to the brick house. The wolf huffed and puffed, but he could not blow it down!", "text_vi": "Cả hai chạy đến nhà gạch. Sói thổi mãi nhưng không thổi bay được!"},
  {"image": "", "text_en": "The wolf tried to come down the chimney, but the pigs had a pot of hot water waiting. The wolf ran away and never came back.", "text_vi": "Sói cố chui qua ống khói nhưng lợn có nồi nước nóng chờ sẵn. Sói chạy mất và không bao giờ quay lại."},
  {"image": "", "text_en": "The three little pigs lived happily ever after in the strong brick house. The End.", "text_vi": "Ba chú heo sống hạnh phúc mãi mãi trong nhà gạch. Hết."}
]'::jsonb,
'["straw", "sticks", "bricks", "wolf", "chimney", "strong"]'::jsonb,
'{"match": [], "fill_blank": []}'::jsonb),

-- Story 3: The Tortoise and the Hare
('tortoise-and-hare', 'The Tortoise and the Hare', 'Rùa và Thỏ', 'Elementary', ARRAY['animals', 'lesson', 'perseverance'],
'https://picsum.photos/seed/tortoise/400/300',
5,
'[
  {"image": "", "text_en": "One day, a hare saw a tortoise walking very slowly down the road.", "text_vi": "Một ngày, con thỏ thấy con rùa đang đi rất chậm trên đường."},
  {"image": "", "text_en": "\"You are so slow!\" laughed the hare. \"I could beat you in a race with my eyes closed!\"", "text_vi": "\"Mày chậm quá!\" thỏ cười. \"Tao có thể đánh bại mày trong cuộc đua mà nhắm mắt!\""},
  {"image": "", "text_en": "\"Let''s have a race then,\" said the tortoise calmly.", "text_vi": "\"Vậy thì đua thôi,\" rùa bình tĩnh nói."},
  {"image": "", "text_en": "The race began. The hare ran very fast and was soon far ahead. He looked back and could barely see the tortoise.", "text_vi": "Cuộc đua bắt đầu. Thỏ chạy rất nhanh và sớm dẫn trước xa. Nó nhìn lại và hầu như không thấy rùa."},
  {"image": "", "text_en": "\"That slowpoke will never catch me,\" thought the hare. \"I have time for a nap.\"", "text_vi": "\"Con chậm chạp kia không bao giờ bắt kịp được,\" thỏ nghĩ. \"Ta có thời gian ngủ một giấc.\""},
  {"image": "", "text_en": "The hare lay down under a shady tree and fell fast asleep.", "text_vi": "Thỏ nằm dưới gốc cây râm mát và ngủ say."},
  {"image": "", "text_en": "Meanwhile, the tortoise kept walking. Slowly but surely, step by step, he passed the sleeping hare.", "text_vi": "Trong khi đó, rùa tiếp tục đi. Chậm nhưng chắc chắn, từng bước một, nó đi qua thỏ đang ngủ."},
  {"image": "", "text_en": "When the hare finally woke up, he saw the tortoise was almost at the finish line!", "text_vi": "Khi thỏ cuối cùng tỉnh dậy, nó thấy rùa gần đến đích!"},
  {"image": "", "text_en": "The hare ran as fast as he could, but it was too late. The tortoise crossed the finish line first!", "text_vi": "Thỏ chạy hết tốc lực, nhưng đã quá muộn. Rùa đến đích trước!"},
  {"image": "", "text_en": "\"Slow and steady wins the race,\" said the tortoise with a smile.", "text_vi": "\"Chậm mà chắc sẽ thắng cuộc,\" rùa mỉm cười nói."},
  {"image": "", "text_en": "The hare learned an important lesson that day. The End.", "text_vi": "Thỏ học được bài học quan trọng ngày hôm đó. Hết."}
]'::jsonb,
'["tortoise", "hare", "race", "slow", "steady", "finish"]'::jsonb,
'{"match": [], "fill_blank": []}'::jsonb),

-- Story 4: Goldilocks
('goldilocks-three-bears', 'Goldilocks and the Three Bears', 'Cô bé tóc vàng và ba con gấu', 'Beginner', ARRAY['adventure', 'family', 'manners'],
'https://picsum.photos/seed/goldilocks/400/300',
6,
'[
  {"image": "", "text_en": "Once upon a time, there was a little girl called Goldilocks. She had beautiful golden hair.", "text_vi": "Ngày xửa ngày xưa, có một cô bé tên Goldilocks với mái tóc vàng óng."},
  {"image": "", "text_en": "One day, Goldilocks went for a walk in the forest. She found a cottage and went inside.", "text_vi": "Một ngày, Goldilocks đi dạo trong rừng. Cô tìm thấy một ngôi nhà và đi vào."},
  {"image": "", "text_en": "On the table were three bowls of porridge. She tasted the big bowl - too hot! The medium bowl - too cold! The small bowl - just right! She ate it all.", "text_vi": "Trên bàn có ba bát cháo. Cô nếm bát lớn - nóng quá! Bát vừa - lạnh quá! Bát nhỏ - vừa phải! Cô ăn hết."},
  {"image": "", "text_en": "Then she saw three chairs. The big chair - too hard! The medium chair - too soft! The small chair - just right! But it broke!", "text_vi": "Rồi cô thấy ba cái ghế. Ghế lớn - cứng quá! Ghế vừa - mềm quá! Ghế nhỏ - vừa phải! Nhưng nó bị vỡ!"},
  {"image": "", "text_en": "Goldilocks was tired. She found three beds upstairs. The big bed - too hard! The medium bed - too soft! The small bed - just right! She fell asleep.", "text_vi": "Goldilocks mệt. Cô tìm thấy ba cái giường ở tầng trên. Giường lớn - cứng! Giường vừa - mềm! Giường nhỏ - vừa! Cô ngủ thiếp đi."},
  {"image": "", "text_en": "Soon, the three bears came home. \"Someone''s been eating my porridge!\" said Father Bear. \"Someone''s been sitting in my chair!\" said Mother Bear. \"Someone''s been sleeping in my bed - and she''s still there!\" cried Baby Bear.", "text_vi": "Chẳng bao lâu, ba con gấu về nhà. \"Có ai đó ăn cháo của tôi!\" Gấu Bố nói. \"Có ai đó ngồi ghế của tôi!\" Gấu Mẹ nói. \"Có ai đó ngủ trên giường của con - và vẫn còn đó!\" Gấu Con kêu."},
  {"image": "", "text_en": "Goldilocks woke up, saw the bears, jumped out the window, and ran all the way home!", "text_vi": "Goldilocks tỉnh dậy, thấy gấu, nhảy qua cửa sổ và chạy về nhà!"},
  {"image": "", "text_en": "She never went into anyone''s house without asking again. The End.", "text_vi": "Cô không bao giờ vào nhà người khác mà không xin phép nữa. Hết."}
]'::jsonb,
'["golden", "porridge", "cottage", "bears", "forest", "chair"]'::jsonb,
'{"match": [], "fill_blank": []}'::jsonb),

-- Story 5: The Lion and the Mouse
('lion-and-mouse', 'The Lion and the Mouse', 'Sư tử và Chuột', 'Elementary', ARRAY['animals', 'friendship', 'kindness'],
'https://picsum.photos/seed/lion/400/300',
5,
'[
  {"image": "", "text_en": "One day, a mighty lion was sleeping in the jungle. A little mouse ran across his nose and woke him up.", "text_vi": "Một ngày, một con sư tử hùng mạnh đang ngủ trong rừng. Một con chuột nhỏ chạy qua mũi nó và đánh thức nó."},
  {"image": "", "text_en": "The lion caught the mouse in his huge paw. \"How dare you wake me up!\" roared the lion. \"I will eat you!\"", "text_vi": "Sư tử bắt chuột trong móng vuốt to lớn. \"Sao dám đánh thức ta!\" sư tử gầm. \"Ta sẽ ăn thịt ngươi!\""},
  {"image": "", "text_en": "\"Please let me go!\" cried the mouse. \"One day, I will help you!\"", "text_vi": "\"Làm ơn tha cho tôi!\" chuột khóc. \"Một ngày nào đó, tôi sẽ giúp ngài!\""},
  {"image": "", "text_en": "The lion laughed. \"How could a tiny mouse ever help me?\" But he let the mouse go anyway.", "text_vi": "Sư tử cười. \"Làm sao một con chuột nhỏ bé có thể giúp ta?\" Nhưng nó vẫn thả chuột."},
  {"image": "", "text_en": "A few days later, the lion was caught in a hunter''s net. He roared and roared, but he could not escape.", "text_vi": "Vài ngày sau, sư tử bị mắc vào lưới thợ săn. Nó gầm rống nhưng không thể thoát."},
  {"image": "", "text_en": "The little mouse heard the lion''s roars. She ran to help. With her sharp teeth, she chewed through the ropes of the net.", "text_vi": "Con chuột nhỏ nghe tiếng gầm. Nó chạy đến giúp. Với răng nhọn, nó gặm đứt dây lưới."},
  {"image": "", "text_en": "Soon, the lion was free! \"Thank you, little mouse,\" said the lion. \"I was wrong. Even the smallest friend can be the greatest help.\"", "text_vi": "Chẳng bao lâu, sư tử tự do! \"Cảm ơn, chuột nhỏ,\" sư tử nói. \"Ta đã sai. Ngay cả người bạn nhỏ nhất cũng có thể giúp ích lớn lao.\""},
  {"image": "", "text_en": "From that day on, the lion and the mouse were the best of friends. The End.", "text_vi": "Từ ngày đó, sư tử và chuột là bạn thân nhất. Hết."}
]'::jsonb,
'["mighty", "jungle", "paw", "roared", "escape", "chewed"]'::jsonb,
'{"match": [], "fill_blank": []}'::jsonb);
