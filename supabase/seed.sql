-- GENERATED FILE — DO NOT EDIT.
--
-- Produced by `npm run content:seed` from the YAML in content/ (SPEC §52).
-- Edit the content files and regenerate; changes made here are lost on the next run.
--
-- Applied automatically by `supabase db reset` against the LOCAL database only.
-- It contains developer test accounts with entitlement fixtures, which must never
-- reach production (SPEC §31).

begin;

-- ============================================================ content

insert into public.courses (id, slug, title, description, language, icon_key, order_index) values
  ('63537f48-2a70-4e15-a7eb-b85f4ea8f637', 'python-fundamentals', '{"en":"Python Fundamentals"}'::jsonb, '{"en":"Learn Python from the very beginning — one short session at a time."}'::jsonb, 'python', 'python', 0)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  language = excluded.language,
  icon_key = excluded.icon_key,
  order_index = excluded.order_index
;

insert into public.modules (id, course_id, slug, title, description, order_index, is_premium_override, estimated_minutes) values
  ('7cd509b8-8fc4-4d5d-8127-2ab94a639bc4', '63537f48-2a70-4e15-a7eb-b85f4ea8f637', 'getting-started', '{"en":"Getting Started"}'::jsonb, '{"en":"What Python is, how to make it say something, and how to read it when it complains."}'::jsonb, 1, null, 20),
  ('7cecf0b8-fb35-40a1-aa60-952d6d23da03', '63537f48-2a70-4e15-a7eb-b85f4ea8f637', 'variables', '{"en":"Variables & Assignment"}'::jsonb, '{"en":"Storing values, naming them well, and changing them as your program runs."}'::jsonb, 2, null, 22)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  order_index = excluded.order_index,
  is_premium_override = excluded.is_premium_override,
  estimated_minutes = excluded.estimated_minutes
;

insert into public.lessons (id, module_id, slug, title, summary, order_index, estimated_minutes, review_status, content_hash) values
  ('ae47f49b-9ada-4145-af64-a445fd72dc15', '7cd509b8-8fc4-4d5d-8127-2ab94a639bc4', 'what-is-python', '{"en":"What is Python?"}'::jsonb, '{"en":"Where Python fits, and what happens when you run a program."}'::jsonb, 1, 4, 'reviewed'::public.review_status, 'bda7fb9fa6beb1fa40e97f6326465449'),
  ('8b14ce7b-46ce-44a3-b97a-92d34a1689d4', '7cd509b8-8fc4-4d5d-8127-2ab94a639bc4', 'printing', '{"en":"Showing output with print"}'::jsonb, '{"en":"Getting your program to say something, and controlling exactly what it says."}'::jsonb, 2, 5, 'reviewed'::public.review_status, 'c759914058a97b3cc144da8f52ad1d99'),
  ('a6e49edf-a740-4668-a22d-c1c46a544b0f', '7cd509b8-8fc4-4d5d-8127-2ab94a639bc4', 'comments', '{"en":"Notes to yourself — comments"}'::jsonb, '{"en":"Writing lines Python ignores, and why you will be glad you did."}'::jsonb, 3, 4, 'reviewed'::public.review_status, '34c6ad08c7c621ceed674b6b3247e888'),
  ('4df3daa1-5801-4173-b93d-46ce15a385cd', '7cd509b8-8fc4-4d5d-8127-2ab94a639bc4', 'reading-errors', '{"en":"Reading an error message"}'::jsonb, '{"en":"Errors are instructions, not insults. Learning to read them saves hours."}'::jsonb, 4, 5, 'reviewed'::public.review_status, 'f18ae6b7640cf31b6ab8b47bfd78581b'),
  ('a061f1ed-25e6-47db-9bc2-1610f7676d54', '7cecf0b8-fb35-40a1-aa60-952d6d23da03', 'creating-variables', '{"en":"Storing a value in a variable"}'::jsonb, '{"en":"Giving a value a name so you can use it again."}'::jsonb, 1, 5, 'reviewed'::public.review_status, 'a311a21a2037da3d71724194eafa8e7e'),
  ('3fba4acd-580c-4b58-bb81-3723335f9c95', '7cecf0b8-fb35-40a1-aa60-952d6d23da03', 'naming-variables', '{"en":"Choosing good names"}'::jsonb, '{"en":"What Python allows, and what your future self will thank you for."}'::jsonb, 2, 5, 'reviewed'::public.review_status, 'be61d0b545d45f79d3f80b5edb9cd339'),
  ('e4d23af9-8917-4945-b4aa-a5ec4878dba5', '7cecf0b8-fb35-40a1-aa60-952d6d23da03', 'changing-values', '{"en":"Changing what a variable holds"}'::jsonb, '{"en":"Reassignment, and why the order of lines decides the answer."}'::jsonb, 3, 5, 'reviewed'::public.review_status, 'dec229ac2029f5e6ebbdf27b61187ef7'),
  ('1efcab6f-3118-4d16-966a-83214cc494b8', '7cecf0b8-fb35-40a1-aa60-952d6d23da03', 'using-variables-together', '{"en":"Putting variables to work"}'::jsonb, '{"en":"Combining values, and what happens when the types do not match."}'::jsonb, 4, 6, 'reviewed'::public.review_status, '350fb2a031e07128c4f13725770d094b')
on conflict (id) do update set
  module_id = excluded.module_id,
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  order_index = excluded.order_index,
  estimated_minutes = excluded.estimated_minutes,
  review_status = excluded.review_status,
  content_hash = excluded.content_hash
;

insert into public.lesson_contents (lesson_id, blocks, content_hash) values
  ('ae47f49b-9ada-4145-af64-a445fd72dc15', '[{"type":"text","body":{"en":"Python is a programming language: a way of writing instructions precisely enough that\na computer can carry them out. You write plain text, and Python reads it from top to\nbottom and does what it says.\n"}},{"type":"text","body":{"en":"People choose Python because it reads close to English. Here is a complete, working\nprogram.\n"}},{"type":"code","code":"print(\"Hello!\")\n","output":"Hello!","runnable":true,"caption":{"en":"One line, and it really is the whole program."}},{"type":"text","body":{"en":"The thing that reads your code and runs it is called the **interpreter**. It works\nthrough your file one line at a time, in order. Nothing happens out of sequence, and\nnothing runs until you ask it to.\n"}},{"type":"callout","variant":"note","body":{"en":"Python does not need to be \"compiled\" into a separate program first. You write a file\nand run it. That short loop is a large part of why it suits learning.\n"}},{"type":"question","question_id":"a1a77c7f-c0a4-4320-8fd0-734d9d9d895a"},{"type":"question","question_id":"f931c8e5-5cf2-41f0-95c0-8ee0f585bb40"},{"type":"question","question_id":"2f2a58fa-0c26-4b3d-9b20-825ea7d3be34"},{"type":"question","question_id":"87b202d9-5f8a-4f33-a208-81b1775a74b9"},{"type":"question","question_id":"12c1b591-5eca-4a56-88e1-a6c8847efe6f"}]'::jsonb, '2ada6d36dbb6807542ea9911dc53e8e7'),
  ('8b14ce7b-46ce-44a3-b97a-92d34a1689d4', '[{"type":"text","body":{"en":"`print` is how a program shows something to the person running it. Whatever you put\nbetween the brackets gets displayed.\n"}},{"type":"code","code":"print(\"Learning Python\")\n","output":"Learning Python","runnable":true},{"type":"text","body":{"en":"You can print several things at once by separating them with commas. Python puts a\nsingle space between them.\n"}},{"type":"code","code":"print(\"Total:\", 42)\n","output":"Total: 42","runnable":true,"caption":{"en":"Notice the space between the text and the number — you did not type it."}},{"type":"text","body":{"en":"Each `print` starts a new line, so two prints produce two lines of output.\n"}},{"type":"code","code":"print(\"first\")\nprint(\"second\")\n","output":"first\nsecond","runnable":true},{"type":"callout","variant":"mistake","body":{"en":"Quotes change what a value is. `print(2 + 2)` adds two numbers and shows 4, while\n`print(\"2\" + \"2\")` joins two pieces of text and shows 22.\n"}},{"type":"question","question_id":"3c5222fe-517a-49ac-91d7-1a137a528870"},{"type":"question","question_id":"16cdc674-e894-45ae-b0d6-54446f427e50"},{"type":"question","question_id":"fb9e4bbf-0fd7-435f-b470-ff2be737db00"},{"type":"question","question_id":"772a78bc-1901-431c-b779-cedc8112f099"},{"type":"question","question_id":"d6ea8906-8c5b-4c72-9627-e468f1ab4180"}]'::jsonb, '02f0d8b885e6168282e3eb28c9fb9950'),
  ('a6e49edf-a740-4668-a22d-c1c46a544b0f', '[{"type":"text","body":{"en":"A `#` tells Python to ignore the rest of the line. What follows is for people reading\nthe code, not for the computer.\n"}},{"type":"code","code":"# Work out the delivery charge\nprint(5)\n","output":"5","runnable":true},{"type":"text","body":{"en":"A comment can also sit at the end of a line, after some real code.\n"}},{"type":"code","code":"print(19)  # the customer''s age\n","output":"19","runnable":true},{"type":"callout","variant":"tip","body":{"en":"Explain **why**, not **what**. `# add 1 to the total` repeats what the code already\nsays. `# the list is 1-based in the report` tells the reader something the code cannot.\n"}},{"type":"text","body":{"en":"Putting a `#` in front of a working line is a common trick while you are experimenting:\nthe line stays in the file but stops running. It is easy to forget one there, though.\n"}},{"type":"question","question_id":"ab04f186-d7f8-48e2-8daf-85978472e4bf"},{"type":"question","question_id":"a08adf6b-69a1-46dd-a631-c199ceddbbb6"},{"type":"question","question_id":"bdaf51c1-50b6-4c06-b365-3de70c98ff4b"},{"type":"question","question_id":"c3c78549-af7e-42c7-9962-6c2b9042d5ae"},{"type":"question","question_id":"cf7fcce7-ca2c-446d-8acc-a9827967786e"}]'::jsonb, '32fd4e827e21182b576b9ad4a50c5ca0'),
  ('4df3daa1-5801-4173-b93d-46ce15a385cd', '[{"type":"text","body":{"en":"Every programmer sees errors constantly. They are not a sign you are doing badly —\nthey are Python telling you precisely what it could not do.\n"}},{"type":"text","body":{"en":"An error message has three useful parts: the **line** it happened on, the **type** of\nproblem, and a short **description**. Read it from the bottom up: the last line is\nusually the most specific.\n"}},{"type":"code","code":"print(\"hello\"\n","runnable":false,"caption":{"en":"This is missing a closing bracket. Python reports a SyntaxError and points at the line\nwhere it ran out of patience.\n"}},{"type":"text","body":{"en":"Three types you will meet early:\n\n- **SyntaxError** — the text is not valid Python at all, so nothing runs.\n- **NameError** — you used a name Python has never seen.\n- **TypeError** — the values are fine, but not that kind of value for that operation.\n"}},{"type":"callout","variant":"tip","body":{"en":"A SyntaxError often points at the line *after* the real mistake, because that is where\nPython finally noticed. If the reported line looks fine, check the one above it.\n"}},{"type":"question","question_id":"8764fe6c-31ad-43e4-aa11-b920b095f9d2"},{"type":"question","question_id":"95b7fe8c-8ae5-4930-b84a-9d07f3a43192"},{"type":"question","question_id":"6ab13905-9dd5-48b5-b9de-3e36cc96ac0a"},{"type":"question","question_id":"4c85bb3d-07a5-41df-a4f1-ec3fcea3bf10"},{"type":"question","question_id":"a51af7ed-df63-431b-be04-f4762b80590c"}]'::jsonb, '389043aedce5482d30fd031faf0aa2a1'),
  ('a061f1ed-25e6-47db-9bc2-1610f7676d54', '[{"type":"text","body":{"en":"A variable is a name that stands for a value. You create one with `=`, putting the\nname on the left and the value on the right.\n"}},{"type":"code","code":"age = 21\nprint(age)\n","output":"21","runnable":true},{"type":"text","body":{"en":"Read `=` as \"gets\" rather than \"equals\": `age = 21` means *age gets the value 21*. It\nis an instruction, not a statement of fact, and the direction matters — the name on\nthe left receives what is on the right.\n"}},{"type":"text","body":{"en":"Once a name exists you can use it anywhere the value would work.\n"}},{"type":"code","code":"price = 8\nquantity = 3\nprint(price * quantity)\n","output":"24","runnable":true},{"type":"callout","variant":"mistake","body":{"en":"`21 = age` is an error. Python reads the left side as the thing being named, and 21 is\nalready a number — it cannot be given a value.\n"}},{"type":"question","question_id":"04e705b8-a2ca-4e5e-8821-084eed62ab28"},{"type":"question","question_id":"b859ee51-8e4b-4f04-b20c-fc13d23ef29c"},{"type":"question","question_id":"57309f58-3482-4930-9a7f-eaa6801b6b43"},{"type":"question","question_id":"ecc4f458-3c1e-48ba-9f4d-de8125d5c911"},{"type":"question","question_id":"8eb4cb1b-0219-4f10-bffd-6d834b5c220b"}]'::jsonb, '6f4a0fe0ae2cef4c0a8707c0bfecca7a'),
  ('3fba4acd-580c-4b58-bb81-3723335f9c95', '[{"type":"text","body":{"en":"Python has only a few rules about names. A name may contain letters, digits and\nunderscores; it may not start with a digit; and it may not contain a space.\n"}},{"type":"code","code":"user_name = \"Ana\"\nscore2 = 17\nprint(user_name, score2)\n","output":"Ana 17","runnable":true},{"type":"text","body":{"en":"Names are case-sensitive, so `total` and `Total` are two different variables. That\ncatches people out constantly.\n"}},{"type":"text","body":{"en":"Beyond the rules there is a convention: Python programmers use `lower_case_with_\nunderscores`. Following it makes your code look like everyone else''s, which makes it\neasier for others — and for you in six months.\n"}},{"type":"callout","variant":"tip","body":{"en":"A good name says what the value means, not what type it is. `price` beats `p`, and\n`days_remaining` beats `number`.\n"}},{"type":"question","question_id":"b623e3ea-65c0-41aa-9282-1255ae18f0f0"},{"type":"question","question_id":"93dcaabb-c9f7-4388-8dd7-be3e2ca2aeae"},{"type":"question","question_id":"91102369-a309-4de8-be34-02c6bc4c6f72"},{"type":"question","question_id":"5adb7977-9faa-4c44-97f9-851a07dc8c95"},{"type":"question","question_id":"796c7463-0715-40eb-a3e5-52c014b93b0e"}]'::jsonb, 'e29742c0ffe941c2557a3fdca36f4f05'),
  ('e4d23af9-8917-4945-b4aa-a5ec4878dba5', '[{"type":"text","body":{"en":"A variable can be given a new value at any time. The old one is simply replaced.\n"}},{"type":"code","code":"lives = 3\nlives = 2\nprint(lives)\n","output":"2","runnable":true},{"type":"text","body":{"en":"A variable can also be updated using its own current value. Python works out the right\nside first, then stores the result in the name on the left.\n"}},{"type":"code","code":"score = 10\nscore = score + 5\nprint(score)\n","output":"15","runnable":true,"caption":{"en":"`score = score + 5` reads oddly, until you remember `=` means \"gets\"."}},{"type":"text","body":{"en":"Because that pattern is so common, Python has a shorthand: `score += 5` does exactly\nthe same thing.\n"}},{"type":"code","code":"score = 10\nscore += 5\nscore -= 3\nprint(score)\n","output":"12","runnable":true},{"type":"callout","variant":"mistake","body":{"en":"Printing before the update shows the old value. The line that prints decides what you\nsee, not the line that assigns.\n"}},{"type":"question","question_id":"cd3ed4c6-272d-4c33-bd40-e633e6e1fbff"},{"type":"question","question_id":"56285afe-a6a1-4276-ba21-e15aa10d47f6"},{"type":"question","question_id":"697c0320-a823-46f5-a1d5-bbcd013107db"},{"type":"question","question_id":"51f8fc43-8f18-407a-8c3c-6969ed20a125"},{"type":"question","question_id":"184ed59e-ff4f-47c2-a320-351d98580148"}]'::jsonb, '99b765fc4e161b3d9a7874c30f67188e'),
  ('1efcab6f-3118-4d16-966a-83214cc494b8', '[{"type":"text","body":{"en":"Variables become useful when you combine them. Arithmetic works exactly as you would\nexpect, and the result can be stored in a new name.\n"}},{"type":"code","code":"hours = 7\nrate = 12\npay = hours * rate\nprint(pay)\n","output":"84","runnable":true},{"type":"text","body":{"en":"Text can be combined too, with `+`. This is called concatenation, and it joins the\npieces exactly — no space is added for you.\n"}},{"type":"code","code":"first = \"Ada\"\nlast = \"Lovelace\"\nprint(first + \" \" + last)\n","output":"Ada Lovelace","runnable":true,"caption":{"en":"The `\" \"` in the middle is a space, added deliberately."}},{"type":"text","body":{"en":"What you cannot do is add text to a number. Python refuses rather than guessing which\none you meant.\n"}},{"type":"code","code":"age = 21\nprint(\"Age: \" + str(age))\n","output":"Age: 21","runnable":true,"caption":{"en":"`str(age)` turns the number into text first, so `+` has two pieces of text to join."}},{"type":"callout","variant":"note","body":{"en":"`print(\"Age:\", age)` does the same job with less effort — commas handle mixed types on\ntheir own. Reach for `str()` when you need the pieces joined exactly.\n"}},{"type":"question","question_id":"89444f12-ab43-44e5-a276-b4bab12c8bc8"},{"type":"question","question_id":"315015b6-963b-4cfb-acc9-ea68b8e5ae51"},{"type":"question","question_id":"94627b6b-6cda-4f26-bdc7-17ce7531e214"},{"type":"question","question_id":"b1b87037-2ac7-4068-8dcc-aab0c1172c19"},{"type":"question","question_id":"f178061f-8985-4d79-81f2-e2daf4bfb9ae"}]'::jsonb, 'd0ceab87f0b90fe1c4ea06afaef8b3f9')
on conflict (lesson_id) do update set
  blocks = excluded.blocks,
  content_hash = excluded.content_hash
;

insert into public.questions (id, lesson_id, type, difficulty, prompt, code_snippet, payload, explanation, hint, xp_reward, is_premium, is_challenge_eligible, is_exam_eligible, skill_tags, order_index, review_status, content_hash) values
  ('a1a77c7f-c0a4-4320-8fd0-734d9d9d895a', 'ae47f49b-9ada-4145-af64-a445fd72dc15', 'true_false'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Python runs the lines of a program from top to bottom, in order."}'::jsonb, null, '{}'::jsonb, '{"en":"Yes. The interpreter starts at the first line and works downwards. Later you will meet ways to repeat lines or skip them, but the default is always straight down.\n"}'::jsonb, null, null, false, true, true, array['python-basics']::text[], 1, 'reviewed'::public.review_status, 'e08364592067d834f438ded580e435c0'),
  ('f931c8e5-5cf2-41f0-95c0-8ee0f585bb40', 'ae47f49b-9ada-4145-af64-a445fd72dc15', 'multiple_choice'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What is the interpreter?"}'::jsonb, null, '{"options":[{"id":"reads-and-runs","text":{"en":"The program that reads your code and carries out the instructions"}},{"id":"text-editor","text":{"en":"The editor you type your code into"}},{"id":"error-checker","text":{"en":"A tool that only checks your code for mistakes"}},{"id":"website","text":{"en":"The website where Python is downloaded"}}]}'::jsonb, '{"en":"The interpreter is what actually runs your program. Your editor helps you write the text, but on its own it does nothing — the interpreter is what turns that text into something happening.\n"}'::jsonb, '{"en":"Think about which one does something when you press \"run\"."}'::jsonb, null, false, true, true, array['python-basics']::text[], 2, 'reviewed'::public.review_status, '82ab22103bb28f33106620c62587f1ef'),
  ('2f2a58fa-0c26-4b3d-9b20-825ea7d3be34', 'ae47f49b-9ada-4145-af64-a445fd72dc15', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this program print?"}'::jsonb, 'print("Python")
', '{"input":"text"}'::jsonb, '{"en":"`print` shows whatever is inside the brackets. The quotes mark where the text starts and ends — they tell Python how much of the line is text, and are not printed.\n"}'::jsonb, null, null, false, true, true, array['python-basics', 'printing']::text[], 3, 'reviewed'::public.review_status, '872d6698b50f1f97c9587834a59efa62'),
  ('87b202d9-5f8a-4f33-a208-81b1775a74b9', 'ae47f49b-9ada-4145-af64-a445fd72dc15', 'multiple_select'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Which of these are true about Python?"}'::jsonb, null, '{"options":[{"id":"reads-like-english","text":{"en":"Its syntax is designed to be readable"}},{"id":"runs-top-to-bottom","text":{"en":"A program runs from top to bottom by default"}},{"id":"needs-compiling","text":{"en":"You must compile a program into a separate file before running it"}},{"id":"only-websites","text":{"en":"It can only be used to build websites"}},{"id":"plain-text","text":{"en":"You write programs as plain text"}}]}'::jsonb, '{"en":"Python is plain text, readable, and runs top to bottom. It does not need a separate compile step, and it is used well beyond the web — data analysis, automation, science and more.\n"}'::jsonb, null, null, false, true, true, array['python-basics']::text[], 4, 'reviewed'::public.review_status, 'b2f6854bc20beb3fe60ebf71266cfe31'),
  ('12c1b591-5eca-4a56-88e1-a6c8847efe6f', 'ae47f49b-9ada-4145-af64-a445fd72dc15', 'multiple_choice'::public.question_type, 'easy'::public.difficulty_level, '{"en":"You have written a Python file but never run it. What has happened so far?"}'::jsonb, null, '{"options":[{"id":"nothing","text":{"en":"Nothing — it is just text until the interpreter runs it"}},{"id":"half","text":{"en":"Python has already run the first line"}},{"id":"checked","text":{"en":"Python has checked the whole file for mistakes"}},{"id":"saved-output","text":{"en":"The output has been saved, ready to show"}}]}'::jsonb, '{"en":"A Python file is only text until something runs it. That is why a mistake can sit in a file unnoticed for a long time — nobody finds it until that line actually runs.\n"}'::jsonb, null, null, false, false, true, array['python-basics']::text[], 5, 'reviewed'::public.review_status, '3efc35f3cace1483f16cf4de7d8c5b7a'),
  ('3c5222fe-517a-49ac-91d7-1a137a528870', '8b14ce7b-46ce-44a3-b97a-92d34a1689d4', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'print("Score:", 10)
', '{"input":"text"}'::jsonb, '{"en":"The comma separates two items, and Python joins them with a single space. You did not type that space — printing several items always puts one between each pair.\n"}'::jsonb, null, null, false, true, true, array['printing']::text[], 1, 'reviewed'::public.review_status, 'de65b20984cefbd40d9cf9430a77d68d'),
  ('16cdc674-e894-45ae-b0d6-54446f427e50', '8b14ce7b-46ce-44a3-b97a-92d34a1689d4', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'print("up")
print("down")
', '{"input":"choice","options":[{"id":"two-lines","text":{"en":"up\ndown"}},{"id":"one-line-space","text":{"en":"up down"}},{"id":"one-line-joined","text":{"en":"updown"}},{"id":"reversed","text":{"en":"down\nup"}}]}'::jsonb, '{"en":"Every `print` ends its line, so two calls give two lines. They run in the order they are written, which is why \"up\" comes first.\n"}'::jsonb, null, null, false, true, true, array['printing']::text[], 2, 'reviewed'::public.review_status, '3f95e0bba2b584e33b3c041bceb06823'),
  ('fb9e4bbf-0fd7-435f-b470-ff2be737db00', '8b14ce7b-46ce-44a3-b97a-92d34a1689d4', 'fill_blank'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Complete the line so the program displays the word Ready."}'::jsonb, '___("Ready")
', '{"input":"tokens","tokens":["print","show","display","say"]}'::jsonb, '{"en":"`print` is the built-in name Python understands. `show`, `display` and `say` read like English but mean nothing to Python — it only knows the names it was given.\n"}'::jsonb, '{"en":"Which of these have you actually seen in a Python program?"}'::jsonb, null, false, true, true, array['printing']::text[], 3, 'reviewed'::public.review_status, 'cea77a7a26811b582b99acd09ebc7a98'),
  ('772a78bc-1901-431c-b779-cedc8112f099', '8b14ce7b-46ce-44a3-b97a-92d34a1689d4', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What does `print(\"3\" + \"4\")` display?"}'::jsonb, null, '{"options":[{"id":"joined","text":{"en":"34"}},{"id":"added","text":{"en":"7"}},{"id":"spaced","text":{"en":"3 4"}},{"id":"error","text":{"en":"An error, because you cannot add text"}}]}'::jsonb, '{"en":"Both values are text, because of the quotes. For text, `+` means \"join end to end\", so \"3\" and \"4\" become \"34\". Without the quotes it would be arithmetic and give 7.\n"}'::jsonb, '{"en":"Look carefully at where the quotes are."}'::jsonb, null, false, true, true, array['printing', 'data-types']::text[], 4, 'reviewed'::public.review_status, '81887c8ba7362644fe8eb1aade8db081'),
  ('d6ea8906-8c5b-4c72-9627-e468f1ab4180', '8b14ce7b-46ce-44a3-b97a-92d34a1689d4', 'code_ordering'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Arrange these lines so the program counts down from three."}'::jsonb, null, '{"lines":[{"id":"three","text":"print(3)"},{"id":"two","text":"print(2)"},{"id":"one","text":"print(1)"},{"id":"go","text":"print(\"Go!\")"}]}'::jsonb, '{"en":"Python runs lines top to bottom, so the order you write them in is exactly the order they happen in. Counting down means writing them in descending order.\n"}'::jsonb, null, null, false, true, true, array['printing', 'python-basics']::text[], 5, 'reviewed'::public.review_status, '8b46c31353c233c03b6997b4f4a7048f'),
  ('ab04f186-d7f8-48e2-8daf-85978472e4bf', 'a6e49edf-a740-4668-a22d-c1c46a544b0f', 'true_false'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Python runs the text that comes after a `#`."}'::jsonb, null, '{}'::jsonb, '{"en":"It ignores it completely. Everything from the `#` to the end of that line is for the reader, which is exactly why commenting out a line stops it working.\n"}'::jsonb, null, null, false, true, true, array['comments']::text[], 1, 'reviewed'::public.review_status, '558bfedb4442bd6bb71060a46902f2c8'),
  ('a08adf6b-69a1-46dd-a631-c199ceddbbb6', 'a6e49edf-a740-4668-a22d-c1c46a544b0f', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, '# print("one")
print("two")
', '{"input":"text"}'::jsonb, '{"en":"The first line is commented out, so it never runs. Only the second line produces output — which is why a stray `#` can make code look broken for no visible reason.\n"}'::jsonb, null, null, false, true, true, array['comments', 'printing']::text[], 2, 'reviewed'::public.review_status, 'e78ebd9e1c58a2314732ce4bd89fd3b5'),
  ('bdaf51c1-50b6-4c06-b365-3de70c98ff4b', 'a6e49edf-a740-4668-a22d-c1c46a544b0f', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Which comment is the most useful?"}'::jsonb, null, '{"options":[{"id":"why","text":{"en":"# prices are stored in cents to avoid rounding errors"}},{"id":"what","text":{"en":"# print the price"}},{"id":"obvious","text":{"en":"# this is a comment"}},{"id":"empty","text":{"en":"#"}}]}'::jsonb, '{"en":"The first says something the code cannot: a decision and its reason. The others repeat what is already visible, which means they add reading work without adding understanding — and they go stale when the code changes.\n"}'::jsonb, null, null, false, true, false, array['comments']::text[], 3, 'reviewed'::public.review_status, 'f2cf3fae8026872fa2d12ce61121e67a'),
  ('c3c78549-af7e-42c7-9962-6c2b9042d5ae', 'a6e49edf-a740-4668-a22d-c1c46a544b0f', 'fill_blank'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Complete the line so Python ignores the note at the end."}'::jsonb, 'print("done") ___ finished for today
', '{"input":"tokens","tokens":["#","//","--","**"]}'::jsonb, '{"en":"Python uses `#`. The others start comments in other languages — `//` in JavaScript, `--` in SQL — and Python would try to read them as code and fail.\n"}'::jsonb, null, null, false, true, true, array['comments']::text[], 4, 'reviewed'::public.review_status, '18092a800b31554a822e9eeab149a61c'),
  ('cf7fcce7-ca2c-446d-8acc-a9827967786e', 'a6e49edf-a740-4668-a22d-c1c46a544b0f', 'debugging'::public.question_type, 'medium'::public.difficulty_level, '{"en":"This should greet the user and then show the total, but the greeting never appears. Which line is the problem?\n"}'::jsonb, '# print("Welcome!")
total = 12
print(total)
', '{"mode":"select_line","lines":[{"id":"greeting","text":"# print(\"Welcome!\")"},{"id":"total","text":"total = 12"},{"id":"show","text":"print(total)"}]}'::jsonb, '{"en":"The greeting is commented out, so it never runs. Nothing reports an error, because a comment is perfectly valid — the line simply does nothing. Silent failures like this are why a forgotten `#` can cost so much time.\n"}'::jsonb, '{"en":"Look for a line that Python is ignoring."}'::jsonb, null, false, true, true, array['comments', 'debugging']::text[], 5, 'reviewed'::public.review_status, '446ac0906e5c460f43c55912a48efd88'),
  ('8764fe6c-31ad-43e4-aa11-b920b095f9d2', '4df3daa1-5801-4173-b93d-46ce15a385cd', 'multiple_choice'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Which part of an error message tells you where to look first?"}'::jsonb, null, '{"options":[{"id":"line-number","text":{"en":"The line number"}},{"id":"length","text":{"en":"How long the message is"}},{"id":"first-word","text":{"en":"The first word of the file"}},{"id":"colour","text":{"en":"The colour it is printed in"}}]}'::jsonb, '{"en":"The line number narrows hours of searching down to one line. Check it first, and if that line looks correct, check the line above — a SyntaxError often surfaces late.\n"}'::jsonb, null, null, false, true, true, array['errors']::text[], 1, 'reviewed'::public.review_status, '3a65b93d88eae6589fb0645ed205625b'),
  ('95b7fe8c-8ae5-4930-b84a-9d07f3a43192', '4df3daa1-5801-4173-b93d-46ce15a385cd', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Python says: `NameError: name ''totl'' is not defined`. What has most likely happened?"}'::jsonb, null, '{"options":[{"id":"typo","text":{"en":"A name was misspelled"}},{"id":"broken-python","text":{"en":"Python is installed incorrectly"}},{"id":"too-long","text":{"en":"The name is too long"}},{"id":"needs-quotes","text":{"en":"The name needs quotation marks around it"}}]}'::jsonb, '{"en":"A NameError means Python has never seen that name. Nine times out of ten it is a misspelling of something you did define — here, `totl` where `total` was meant.\n"}'::jsonb, '{"en":"Read the name in the message out loud."}'::jsonb, null, false, true, true, array['errors', 'debugging']::text[], 2, 'reviewed'::public.review_status, 'bd8a1e555995c715d5c714a44ecef94b'),
  ('6ab13905-9dd5-48b5-b9de-3e36cc96ac0a', '4df3daa1-5801-4173-b93d-46ce15a385cd', 'concept_matching'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Match each error type to what causes it."}'::jsonb, null, '{"concepts":[{"id":"syntax","text":{"en":"SyntaxError"}},{"id":"name","text":{"en":"NameError"}},{"id":"type","text":{"en":"TypeError"}}],"definitions":[{"id":"not-valid-python","text":{"en":"The text is not valid Python, so nothing runs at all"}},{"id":"never-seen","text":{"en":"A name was used that Python has never been given"}},{"id":"wrong-kind","text":{"en":"The operation is fine, but not for that kind of value"}}]}'::jsonb, '{"en":"The three differ in when they happen. A SyntaxError stops the program before it starts. A NameError and a TypeError happen while it runs, which means everything before that line already did its work.\n"}'::jsonb, null, null, false, true, true, array['errors']::text[], 3, 'reviewed'::public.review_status, 'a9fe9ddc6af3747e1d34077bc4eb06d0'),
  ('4c85bb3d-07a5-41df-a4f1-ec3fcea3bf10', '4df3daa1-5801-4173-b93d-46ce15a385cd', 'true_false'::public.question_type, 'medium'::public.difficulty_level, '{"en":"If a program has a SyntaxError, the lines before the mistake still run."}'::jsonb, null, '{}'::jsonb, '{"en":"Nothing runs. Python has to read the whole file before it can start, and a SyntaxError means it could not. A NameError is different — it happens while running, so earlier lines have already done their work.\n"}'::jsonb, null, null, false, true, true, array['errors', 'python-basics']::text[], 4, 'reviewed'::public.review_status, 'ea65bcdaa1b8092dd9ad3bc9d100584b'),
  ('a51af7ed-df63-431b-be04-f4762b80590c', '4df3daa1-5801-4173-b93d-46ce15a385cd', 'debugging'::public.question_type, 'easy'::public.difficulty_level, '{"en":"This program will not start. Which line has the mistake?"}'::jsonb, 'print("Ready")
print("Set"
print("Go")
', '{"mode":"select_line","lines":[{"id":"ready","text":"print(\"Ready\")"},{"id":"set","text":"print(\"Set\""},{"id":"go","text":"print(\"Go\")"}]}'::jsonb, '{"en":"The second line never closes its bracket. Python reads on looking for the closing `)`, reaches the next line, and reports the error there — which is why the line it names is often one below the real mistake.\n"}'::jsonb, '{"en":"Count the opening and closing brackets on each line."}'::jsonb, null, false, true, true, array['errors', 'debugging']::text[], 5, 'reviewed'::public.review_status, 'feb6b10742d4053fcef09edb7b96c79e'),
  ('04e705b8-a2ca-4e5e-8821-084eed62ab28', 'a061f1ed-25e6-47db-9bc2-1610f7676d54', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'city = "Cluj"
print(city)
', '{"input":"text"}'::jsonb, '{"en":"`city` stands for the text \"Cluj\", so printing the name prints the value. Note there are no quotes around `city` in the print — quotes would make it the literal word.\n"}'::jsonb, null, null, false, true, true, array['variables']::text[], 1, 'reviewed'::public.review_status, '6af99cfebcee2b8f47262f435172043a'),
  ('b859ee51-8e4b-4f04-b20c-fc13d23ef29c', 'a061f1ed-25e6-47db-9bc2-1610f7676d54', 'fill_blank'::public.question_type, 'easy'::public.difficulty_level, '{"en":"Complete the line so the name `total` stands for the number 50."}'::jsonb, 'total ___ 50
', '{"input":"tokens","tokens":["=","==",":","=>"]}'::jsonb, '{"en":"A single `=` assigns. A double `==` is a question — it asks whether two values are the same — and you will meet it when you start writing conditions.\n"}'::jsonb, null, null, false, true, true, array['variables']::text[], 2, 'reviewed'::public.review_status, 'd99dbf01c396499640e5068c62102f18'),
  ('57309f58-3482-4930-9a7f-eaa6801b6b43', 'a061f1ed-25e6-47db-9bc2-1610f7676d54', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Why does `5 = score` cause an error?"}'::jsonb, null, '{"options":[{"id":"wrong-side","text":{"en":"The name being assigned to must be on the left"}},{"id":"too-small","text":{"en":"5 is too small to store"}},{"id":"needs-quotes","text":{"en":"Numbers need quotation marks"}},{"id":"reserved","text":{"en":"`score` is a reserved word in Python"}}]}'::jsonb, '{"en":"Assignment always flows right to left: the value on the right is given to the name on the left. `5` is already a number, so there is nothing to name it with.\n"}'::jsonb, '{"en":"Which side of the `=` receives the value?"}'::jsonb, null, false, true, true, array['variables', 'errors']::text[], 3, 'reviewed'::public.review_status, '9c0b948aee7831286e82f58158b489a0'),
  ('ecc4f458-3c1e-48ba-9f4d-de8125d5c911', 'a061f1ed-25e6-47db-9bc2-1610f7676d54', 'code_ordering'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Arrange the lines so the program prints the area of the rectangle."}'::jsonb, null, '{"lines":[{"id":"width","text":"width = 4"},{"id":"height","text":"height = 5"},{"id":"area","text":"area = width * height"},{"id":"show","text":"print(area)"}]}'::jsonb, '{"en":"A name has to exist before it can be used. `area` needs both `width` and `height` already defined, and `print(area)` needs `area`. Running them in any other order gives a NameError.\n"}'::jsonb, null, null, false, true, true, array['variables', 'python-basics']::text[], 4, 'reviewed'::public.review_status, 'b680f6b122a5c1927f1beaaa246ec4e9'),
  ('8eb4cb1b-0219-4f10-bffd-6d834b5c220b', 'a061f1ed-25e6-47db-9bc2-1610f7676d54', 'true_false'::public.question_type, 'easy'::public.difficulty_level, '{"en":"A variable must be created before the line that uses it."}'::jsonb, null, '{}'::jsonb, '{"en":"Python runs top to bottom and only knows a name once it has been assigned. Using it earlier gives a NameError, even if the assignment appears further down the file.\n"}'::jsonb, null, null, false, true, true, array['variables', 'errors']::text[], 5, 'reviewed'::public.review_status, '624be4685312320d617f1ce231d25c54'),
  ('b623e3ea-65c0-41aa-9282-1255ae18f0f0', '3fba4acd-580c-4b58-bb81-3723335f9c95', 'multiple_select'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Which of these are valid variable names in Python?"}'::jsonb, null, '{"options":[{"id":"user-name","text":{"en":"user_name"}},{"id":"score2","text":{"en":"score2"}},{"id":"two-words","text":{"en":"two words"}},{"id":"leading-digit","text":{"en":"2nd_place"}},{"id":"underscore","text":{"en":"_total"}}]}'::jsonb, '{"en":"Letters, digits and underscores are allowed, and a name may start with a letter or an underscore. It may not contain a space, and it may not start with a digit — Python would begin reading `2nd_place` as a number.\n"}'::jsonb, null, null, false, true, true, array['variables', 'naming']::text[], 1, 'reviewed'::public.review_status, '1525c2561f3754d760a1c3afb3d07680'),
  ('93dcaabb-c9f7-4388-8dd7-be3e2ca2aeae', '3fba4acd-580c-4b58-bb81-3723335f9c95', 'predict_output'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'total = 10
Total = 20
print(total)
', '{"input":"text"}'::jsonb, '{"en":"Names are case-sensitive, so `total` and `Total` are two separate variables. The second line creates a new one rather than changing the first — a mistake that produces no error at all, just a wrong answer.\n"}'::jsonb, null, null, false, true, true, array['variables', 'naming']::text[], 2, 'reviewed'::public.review_status, 'a60b1df4d89ff803656bf4603bfae5c9'),
  ('91102369-a309-4de8-be34-02c6bc4c6f72', '3fba4acd-580c-4b58-bb81-3723335f9c95', 'debugging'::public.question_type, 'medium'::public.difficulty_level, '{"en":"This program should print the greeting, but it fails. Which line is wrong?"}'::jsonb, 'message = "Hi there"
print(Message)
', '{"mode":"select_line","lines":[{"id":"assign","text":"message = \"Hi there\""},{"id":"show","text":"print(Message)"}]}'::jsonb, '{"en":"The variable was created as `message` but printed as `Message`. Python treats those as different names, so it reports a NameError for one it has never seen.\n"}'::jsonb, '{"en":"Compare the two names letter by letter."}'::jsonb, null, false, true, true, array['variables', 'naming', 'debugging']::text[], 3, 'reviewed'::public.review_status, 'c0e7fcb7ebb9945d4eb78e948cc8f310'),
  ('5adb7977-9faa-4c44-97f9-851a07dc8c95', '3fba4acd-580c-4b58-bb81-3723335f9c95', 'true_false'::public.question_type, 'easy'::public.difficulty_level, '{"en":"`item count = 5` is a valid way to create a variable."}'::jsonb, null, '{}'::jsonb, '{"en":"A name cannot contain a space — Python would read `item` and then not know what to do with `count`. Use `item_count` instead.\n"}'::jsonb, null, null, false, true, true, array['variables', 'naming']::text[], 4, 'reviewed'::public.review_status, '020b4e21407c3caeab6537ca2ea6e19a'),
  ('796c7463-0715-40eb-a3e5-52c014b93b0e', '3fba4acd-580c-4b58-bb81-3723335f9c95', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Which name best follows Python''s conventions for a person''s date of birth?"}'::jsonb, null, '{"options":[{"id":"snake","text":{"en":"date_of_birth"}},{"id":"camel","text":{"en":"dateOfBirth"}},{"id":"short","text":{"en":"dob"}},{"id":"typed","text":{"en":"str_date"}}]}'::jsonb, '{"en":"Python uses lower case with underscores. `dateOfBirth` is the convention in other languages, `dob` needs explaining, and `str_date` describes the type rather than the meaning — and would be wrong the moment the value changed type.\n"}'::jsonb, null, null, false, true, false, array['naming']::text[], 5, 'reviewed'::public.review_status, '7e139446a5b033167939d21cdef8f97e'),
  ('cd3ed4c6-272d-4c33-bd40-e633e6e1fbff', 'e4d23af9-8917-4945-b4aa-a5ec4878dba5', 'predict_output'::public.question_type, 'easy'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'count = 1
count = 4
print(count)
', '{"input":"text"}'::jsonb, '{"en":"The second assignment replaces the first. A variable holds one value at a time, and the most recent assignment before the print is the one that counts.\n"}'::jsonb, null, null, false, true, true, array['variables', 'reassignment']::text[], 1, 'reviewed'::public.review_status, '2810c675a31825de0e8caf0546085c32'),
  ('56285afe-a6a1-4276-ba21-e15aa10d47f6', 'e4d23af9-8917-4945-b4aa-a5ec4878dba5', 'predict_output'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'total = 7
print(total)
total = 12
', '{"input":"text"}'::jsonb, '{"en":"The print runs before the second assignment, so it shows 7. The value does become 12 — just after the only line that would have shown it.\n"}'::jsonb, '{"en":"Follow the lines strictly in order."}'::jsonb, null, false, true, true, array['variables', 'reassignment']::text[], 2, 'reviewed'::public.review_status, 'c137ffa399d5efe44cbd49dbe417d689'),
  ('697c0320-a823-46f5-a1d5-bbcd013107db', 'e4d23af9-8917-4945-b4aa-a5ec4878dba5', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What is `x` after these two lines?"}'::jsonb, 'x = 6
x = x * 2
', '{"options":[{"id":"twelve","text":{"en":"12"}},{"id":"six","text":{"en":"6"}},{"id":"error","text":{"en":"An error, because x is used to define itself"}},{"id":"two","text":{"en":"2"}}]}'::jsonb, '{"en":"Python calculates the right side first, using the current value: 6 times 2 is 12. Only then does it store that result back in `x`. There is no circularity, because the reading happens before the writing.\n"}'::jsonb, null, null, false, true, true, array['variables', 'reassignment']::text[], 3, 'reviewed'::public.review_status, '60b6780b2378a89e5f3bd2cee6b072c2'),
  ('51f8fc43-8f18-407a-8c3c-6969ed20a125', 'e4d23af9-8917-4945-b4aa-a5ec4878dba5', 'code_ordering'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Arrange the lines so the program ends by printing 8."}'::jsonb, null, '{"lines":[{"id":"start","text":"value = 10"},{"id":"add","text":"value += 1"},{"id":"subtract","text":"value -= 3"},{"id":"show","text":"print(value)"}]}'::jsonb, '{"en":"Ten, plus one, minus three, gives eight — and the print has to come last to see it. Each line changes the value in place, so the order of the arithmetic is the order of the lines.\n"}'::jsonb, null, null, false, true, true, array['variables', 'reassignment']::text[], 4, 'reviewed'::public.review_status, 'ae813c983a8f31ac62a08ede7158bb05'),
  ('184ed59e-ff4f-47c2-a320-351d98580148', 'e4d23af9-8917-4945-b4aa-a5ec4878dba5', 'debugging'::public.question_type, 'hard'::public.difficulty_level, '{"en":"This should print the total after the discount, but it prints the price before it. Which line needs to move?\n"}'::jsonb, 'price = 100
print(price)
price -= 20
', '{"mode":"select_line","lines":[{"id":"set","text":"price = 100"},{"id":"show","text":"print(price)"},{"id":"discount","text":"price -= 20"}]}'::jsonb, '{"en":"Nothing here is wrong in isolation — the mistake is the order. The print happens before the discount is applied, so it reports a value that is technically correct and completely useless. Bugs of this kind never raise an error.\n"}'::jsonb, '{"en":"Every line is valid Python. Ask when each one happens."}'::jsonb, null, false, true, true, array['variables', 'reassignment', 'debugging']::text[], 5, 'reviewed'::public.review_status, '440035d68c588f81ddc98ce5d96d3876'),
  ('89444f12-ab43-44e5-a276-b4bab12c8bc8', '1efcab6f-3118-4d16-966a-83214cc494b8', 'predict_output'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What does this print?"}'::jsonb, 'a = 3
b = 4
print(a + b)
', '{"input":"text"}'::jsonb, '{"en":"Both values are numbers, so `+` adds them. Had they been written \"3\" and \"4\" with quotes, the same `+` would have joined them into \"34\" instead.\n"}'::jsonb, null, null, false, true, true, array['variables', 'arithmetic']::text[], 1, 'reviewed'::public.review_status, '4627214a706eb473ac3bbb72ebd68bea'),
  ('315015b6-963b-4cfb-acc9-ea68b8e5ae51', '1efcab6f-3118-4d16-966a-83214cc494b8', 'fill_blank'::public.question_type, 'medium'::public.difficulty_level, '{"en":"Complete the line so the number can be joined to the text."}'::jsonb, 'count = 5
print("You have " + ___(count) + " messages")
', '{"input":"tokens","tokens":["str","int","float","text"]}'::jsonb, '{"en":"`str()` converts a value to text, which is what `+` needs on both sides here. `int()` would go the other way, and `text()` is not a Python function at all.\n"}'::jsonb, '{"en":"Which kind of value does `+` need on both sides to join them?"}'::jsonb, null, false, true, true, array['variables', 'data-types']::text[], 2, 'reviewed'::public.review_status, '56bc8f47e59ce51b712e12657a59dd8d'),
  ('94627b6b-6cda-4f26-bdc7-17ce7531e214', '1efcab6f-3118-4d16-966a-83214cc494b8', 'multiple_choice'::public.question_type, 'medium'::public.difficulty_level, '{"en":"What happens when you run `print(\"Total: \" + 5)`?"}'::jsonb, null, '{"options":[{"id":"type-error","text":{"en":"A TypeError, because text and a number cannot be joined"}},{"id":"works","text":{"en":"It prints `Total: 5`"}},{"id":"adds","text":{"en":"It prints `Total: ` followed by nothing"}},{"id":"converts","text":{"en":"Python converts the number to text automatically"}}]}'::jsonb, '{"en":"Python refuses to guess. Joining text and adding numbers are different operations that share the `+` symbol, so mixing the two is ambiguous — and Python would rather stop than pick the wrong one silently.\n"}'::jsonb, null, null, false, true, true, array['data-types', 'errors']::text[], 3, 'reviewed'::public.review_status, 'eeac1c08d1b8bd79c88f5025c25892e8'),
  ('b1b87037-2ac7-4068-8dcc-aab0c1172c19', '1efcab6f-3118-4d16-966a-83214cc494b8', 'concept_matching'::public.question_type, 'hard'::public.difficulty_level, '{"en":"Match each expression to what it produces."}'::jsonb, null, '{"concepts":[{"id":"numbers","text":{"en":"2 + 3"}},{"id":"strings","text":{"en":"\"2\" + \"3\""}},{"id":"mixed","text":{"en":"\"2\" + 3"}}],"definitions":[{"id":"five","text":{"en":"The number 5"}},{"id":"twentythree","text":{"en":"The text 23"}},{"id":"error","text":{"en":"A TypeError"}}]}'::jsonb, '{"en":"The same `+` means three different things depending on what sits either side: add for numbers, join for text, and refuse for a mixture. The quotes are the only visible difference, which is why they repay careful reading.\n"}'::jsonb, null, null, false, true, true, array['data-types', 'arithmetic']::text[], 4, 'reviewed'::public.review_status, 'b47c2771e6aca706bc2267f8d9022878'),
  ('f178061f-8985-4d79-81f2-e2daf4bfb9ae', '1efcab6f-3118-4d16-966a-83214cc494b8', 'multiple_select'::public.question_type, 'hard'::public.difficulty_level, '{"en":"Which of these lines print exactly `Score: 9`?"}'::jsonb, null, '{"options":[{"id":"comma","text":{"en":"print(\"Score:\", 9)"}},{"id":"str-join","text":{"en":"print(\"Score: \" + str(9))"}},{"id":"plain-join","text":{"en":"print(\"Score: \" + 9)"}},{"id":"no-space","text":{"en":"print(\"Score:\" + str(9))"}},{"id":"two-args","text":{"en":"print(\"Score:\", \"9\")"}}]}'::jsonb, '{"en":"Commas insert exactly one space, so the first and last both give `Score: 9`. The `str()` version supplies its own space inside the quotes. Joining text to a bare number raises a TypeError, and the fourth has no space at all, giving `Score:9`.\n"}'::jsonb, '{"en":"Work out the spaces character by character."}'::jsonb, null, false, true, true, array['printing', 'data-types']::text[], 5, 'reviewed'::public.review_status, '524061fe84ec1bc0786a1a9bd2748972')
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  type = excluded.type,
  difficulty = excluded.difficulty,
  prompt = excluded.prompt,
  code_snippet = excluded.code_snippet,
  payload = excluded.payload,
  explanation = excluded.explanation,
  hint = excluded.hint,
  xp_reward = excluded.xp_reward,
  is_premium = excluded.is_premium,
  is_challenge_eligible = excluded.is_challenge_eligible,
  is_exam_eligible = excluded.is_exam_eligible,
  skill_tags = excluded.skill_tags,
  order_index = excluded.order_index,
  review_status = excluded.review_status,
  content_hash = excluded.content_hash
;

insert into public.question_answer_keys (question_id, answer, match_mode, accepted_answers) values
  ('a1a77c7f-c0a4-4320-8fd0-734d9d9d895a', '{"value":true}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('f931c8e5-5cf2-41f0-95c0-8ee0f585bb40', '{"option_id":"reads-and-runs"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('2f2a58fa-0c26-4b3d-9b20-825ea7d3be34', '{"value":"Python"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('87b202d9-5f8a-4f33-a208-81b1775a74b9', '{"option_ids":["reads-like-english","runs-top-to-bottom","plain-text"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('12c1b591-5eca-4a56-88e1-a6c8847efe6f', '{"option_id":"nothing"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('3c5222fe-517a-49ac-91d7-1a137a528870', '{"value":"Score: 10"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('16cdc674-e894-45ae-b0d6-54446f427e50', '{"value":"up\ndown"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('fb9e4bbf-0fd7-435f-b470-ff2be737db00', '{"value":"print"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('772a78bc-1901-431c-b779-cedc8112f099', '{"option_id":"joined"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('d6ea8906-8c5b-4c72-9627-e468f1ab4180', '{"order":["three","two","one","go"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('ab04f186-d7f8-48e2-8daf-85978472e4bf', '{"value":false}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('a08adf6b-69a1-46dd-a631-c199ceddbbb6', '{"value":"two"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('bdaf51c1-50b6-4c06-b365-3de70c98ff4b', '{"option_id":"why"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('c3c78549-af7e-42c7-9962-6c2b9042d5ae', '{"value":"#"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('cf7fcce7-ca2c-446d-8acc-a9827967786e', '{"line_id":"greeting"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('8764fe6c-31ad-43e4-aa11-b920b095f9d2', '{"option_id":"line-number"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('95b7fe8c-8ae5-4930-b84a-9d07f3a43192', '{"option_id":"typo"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('6ab13905-9dd5-48b5-b9de-3e36cc96ac0a', '{"pairs":{"syntax":"not-valid-python","name":"never-seen","type":"wrong-kind"}}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('4c85bb3d-07a5-41df-a4f1-ec3fcea3bf10', '{"value":false}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('a51af7ed-df63-431b-be04-f4762b80590c', '{"line_id":"set"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('04e705b8-a2ca-4e5e-8821-084eed62ab28', '{"value":"Cluj"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('b859ee51-8e4b-4f04-b20c-fc13d23ef29c', '{"value":"="}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('57309f58-3482-4930-9a7f-eaa6801b6b43', '{"option_id":"wrong-side"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('ecc4f458-3c1e-48ba-9f4d-de8125d5c911', '{"order":["width","height","area","show"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('8eb4cb1b-0219-4f10-bffd-6d834b5c220b', '{"value":true}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('b623e3ea-65c0-41aa-9282-1255ae18f0f0', '{"option_ids":["user-name","score2","underscore"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('93dcaabb-c9f7-4388-8dd7-be3e2ca2aeae', '{"value":"10"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('91102369-a309-4de8-be34-02c6bc4c6f72', '{"line_id":"show"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('5adb7977-9faa-4c44-97f9-851a07dc8c95', '{"value":false}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('796c7463-0715-40eb-a3e5-52c014b93b0e', '{"option_id":"snake"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('cd3ed4c6-272d-4c33-bd40-e633e6e1fbff', '{"value":"4"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('56285afe-a6a1-4276-ba21-e15aa10d47f6', '{"value":"7"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('697c0320-a823-46f5-a1d5-bbcd013107db', '{"option_id":"twelve"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('51f8fc43-8f18-407a-8c3c-6969ed20a125', '{"order":["start","add","subtract","show"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('184ed59e-ff4f-47c2-a320-351d98580148', '{"line_id":"show"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('89444f12-ab43-44e5-a276-b4bab12c8bc8', '{"value":"7"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('315015b6-963b-4cfb-acc9-ea68b8e5ae51', '{"value":"str"}'::jsonb, 'trimmed'::public.answer_match_mode, '[]'::jsonb),
  ('94627b6b-6cda-4f26-bdc7-17ce7531e214', '{"option_id":"type-error"}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('b1b87037-2ac7-4068-8dcc-aab0c1172c19', '{"pairs":{"numbers":"five","strings":"twentythree","mixed":"error"}}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb),
  ('f178061f-8985-4d79-81f2-e2daf4bfb9ae', '{"option_ids":["comma","str-join","two-args"]}'::jsonb, 'exact'::public.answer_match_mode, '[]'::jsonb)
on conflict (question_id) do update set
  answer = excluded.answer,
  match_mode = excluded.match_mode,
  accepted_answers = excluded.accepted_answers
;

insert into public.exams (id, course_id, slug, title, description, question_count, time_limit_minutes, pass_threshold_pct, requires_entitlement) values
  ('6249f5f9-cf88-4c63-96df-c94dae961427', '63537f48-2a70-4e15-a7eb-b85f4ea8f637', 'python-fundamentals-sample', '{"en":"Python Fundamentals — Sample Exam"}'::jsonb, '{"en":"A ten-question taste of the full exam. Free for everyone."}'::jsonb, 10, null, 70, null),
  ('98b56042-630c-4303-9b01-84327d58c912', '63537f48-2a70-4e15-a7eb-b85f4ea8f637', 'python-fundamentals-full', '{"en":"Python Fundamentals Exam"}'::jsonb, '{"en":"Thirty questions across everything the course covers, with a 45 minute timer."}'::jsonb, 30, 45, 70, 'premium'::public.entitlement_id)
on conflict (id) do update set
  course_id = excluded.course_id,
  slug = excluded.slug,
  title = excluded.title,
  description = excluded.description,
  question_count = excluded.question_count,
  time_limit_minutes = excluded.time_limit_minutes,
  pass_threshold_pct = excluded.pass_threshold_pct,
  requires_entitlement = excluded.requires_entitlement
;

-- ============================================================ development accounts

-- Test accounts. Password for all of them: sprint2026
--   free@codesprint.test       Free tier: ads, lives, modules up to the free boundary
--   noads@codesprint.test      No Ads: same content as free, without advertising
--   premium@codesprint.test    Premium: every module, unlimited lives, full exam

-- free@codesprint.test
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'free@codesprint.test',
  extensions.crypt('sprint2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'email',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"free@codesprint.test","email_verified":true}'::jsonb,
  now(), now(), now()
) on conflict (provider, provider_id) do nothing;

-- noads@codesprint.test
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'noads@codesprint.test',
  extensions.crypt('sprint2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  'email',
  '{"sub":"00000000-0000-4000-8000-000000000002","email":"noads@codesprint.test","email_verified":true}'::jsonb,
  now(), now(), now()
) on conflict (provider, provider_id) do nothing;
insert into public.user_entitlements (user_id, entitlement, is_active, store)
values ('00000000-0000-4000-8000-000000000002', 'no_ads'::public.entitlement_id, true, 'dev-seed')
on conflict (user_id, entitlement) do update set is_active = true, store = 'dev-seed';

-- premium@codesprint.test
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'premium@codesprint.test',
  extensions.crypt('sprint2026', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000003',
  'email',
  '{"sub":"00000000-0000-4000-8000-000000000003","email":"premium@codesprint.test","email_verified":true}'::jsonb,
  now(), now(), now()
) on conflict (provider, provider_id) do nothing;
insert into public.user_entitlements (user_id, entitlement, is_active, store)
values ('00000000-0000-4000-8000-000000000003', 'no_ads'::public.entitlement_id, true, 'dev-seed')
on conflict (user_id, entitlement) do update set is_active = true, store = 'dev-seed';
insert into public.user_entitlements (user_id, entitlement, is_active, store)
values ('00000000-0000-4000-8000-000000000003', 'premium'::public.entitlement_id, true, 'dev-seed')
on conflict (user_id, entitlement) do update set is_active = true, store = 'dev-seed';

commit;
