function wrap_choices_debug_in_html(choices, category, exemplar, block){
    txt = `
        <img class="left_choice" src=${choices[0]}></img>
        <img class="right_choice" src=${choices[1]}></img>
        <p>
            cat: ${category} <br> ex: ${exemplar} <br> block_intro: ${block}
        </p>
    `
    return txt
}

function wrap_choices_in_html(choices){
    txt = `
        <img class="left_choice" src=${choices[0]}></img>
        <img class="right_choice" src=${choices[1]}></img>
    `
    return txt
}

function wrap_wrong_feedback_in_html(stimulus, category){
    txt = (category == 1) ?
        `<img class="left_stim" src=${stimulus}></img>`: 
        `<img class="right_stim" src=${stimulus}></img>`

    return txt
}

function wrap_stim_in_html(stimulus){
    txt = `<img class="stim" src=${stimulus}></img>`

    return txt
}

function* range_iter(start, end) {
    for (let i = start; i <= end; i++) {
        yield i;
    }
}

function range(start, end) {
    return Array.from(range_iter(start, end))
}

function exemplar_stimuli(stim_path, pack_ID, category, indices, block){
    return Array.from(
        indices, 
        (idx) => ({
            stimulus: `${stim_path}/pack_${pack_ID}/cat_${category}/ex_${category}_${idx}.png`, 
            correct_response: (category == 1) ? `ArrowLeft` : `ArrowRight`,
            exemplar: idx,
            category: category,
            block_introduced: block
        })
    );
}

function saveData(name, data){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'write_data.php'); // 'write_data.php' is the path to the php file described above.
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({filedata: data}));
}

const DEBUG_MODE = true
var jsPsych = initJsPsych({
    on_finish: function() {
        jsPsych.data.get().localSave('csv','tst.csv');
    }
})

var timeline = [];

N_blocks = 2
N_stim_packs = 2
N_exemplars = 129

var pack_ID = jsPsych.randomization.sampleWithoutReplacement(range(1, N_stim_packs), 1)[0]
var stim_path = "../stimuli/" ;

const stimuli_cat_1 = exemplar_stimuli(stim_path, pack_ID, 1, N_exemplars);
const stimuli_cat_2 = exemplar_stimuli(stim_path, pack_ID, 2, N_exemplars);
const all_stimuli = stimuli_cat_1.concat(stimuli_cat_2);

var preload = {
    type: jsPsychPreload,
    images: function(){
        all_stimuli.map(x => x.stimulus)
    }
};
timeline.push(preload);

var welcome = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "Welcome to the dotCategoryLearn experiment! Press any key to continue.",
  data: {task: 'welcome'}
};
timeline.push(welcome)

var instructions = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>You will be shown a collection of dots. Each set of dots will belong to one of two categories: category A or category B.<br>You will not know in advance which category the given set of dots belongs to.</br></p><p>When you are shown a set of dots, categorize them into category A (left arrow key) or category B (right arrow key)</br>as quickly as possible. You will receive feedback on whether or not your categorization was correct.</p><p>Your goal is to categorize as many sets of dots correctly as possible.</p><p>Press any key to begin.</p>",
  data: {task: 'introduction'}
};
timeline.push(instructions)

var fixation = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<div style="font-size:60px;">+</div>',
    choices: "NO_KEYS",
    trial_duration: 350,
    data: {task: 'fixation'}
};

var test_stim = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function (){
        return wrap_stim_in_html(jsPsych.timelineVariable('stimulus'))
    },
    choices: "NO_KEYS",
    trial_duration: 1000,
    post_trial_gap : 1000,
    data: {task : 'stimulus'}
};

var choice_stimuli = [stim_path + "A.png", stim_path + "B.png"]

var test_choices = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function (){
        return DEBUG_MODE ? 
        wrap_choices_debug_in_html(choice_stimuli, jsPsych.timelineVariable('category'), jsPsych.timelineVariable('exemplar'), jsPsych.timelineVariable('block_introduced')) :
        wrap_choices_in_html(choice_stimuli)
    },
    choices: ['ArrowLeft', 'ArrowRight'],
    data: {
        task: 'response',
        stimulus: jsPsych.timelineVariable('stimulus'),
        correct_response: jsPsych.timelineVariable('correct_response'),
        block_introduced: jsPsych.timelineVariable('block_introduced'),
        exemplar_ID: jsPsych.timelineVariable('exemplar'),
        category: jsPsych.timelineVariable('category')
    },
    on_finish: function(data){
        data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
    }
};

var feedback = {
    type: jsPsychHtmlKeyboardResponse,
    trial_duration: 1000,
    stimulus: function(){
        const last_trial = jsPsych.data.get().last(1).values()[0];
        if(last_trial.correct){
            return "<p>Correct!</p>";
        } else {
            return wrap_wrong_feedback_in_html(last_trial.stimulus, jsPsych.timelineVariable('category'))
        }
    },
    data: {task: 'feedback'}
};

var prev_stim_cat_1 = [];
var prev_stim_cat_2 = [];
var avail_idx_cat_1 = range(1, N_exemplars);
var avail_idx_cat_2 = range(1, N_exemplars);
var N_new_stim_cat_1 = 0;
var N_new_stim_cat_2 = 0;

for (block of range(1, N_blocks)){
    N_new_stim_cat_1 = (2**(block - 1)) - N_new_stim_cat_1;
    const new_idx_cat_1 = jsPsych.randomization.sampleWithoutReplacement(avail_idx_cat_1, N_new_stim_cat_1);
    avail_idx_cat_1 = avail_idx_cat_1.filter(x => !new_idx_cat_1.includes(x));
    const new_stim_cat_1 = exemplar_stimuli(stim_path, pack_ID, 1, new_idx_cat_1, block);
    const stim_cat_1 = new_stim_cat_1.concat(prev_stim_cat_1);

    N_new_stim_cat_2 = (2**(block - 1)) - N_new_stim_cat_2;
    const new_idx_cat_2 = jsPsych.randomization.sampleWithoutReplacement(avail_idx_cat_2, N_new_stim_cat_2);
    avail_idx_cat_2 = avail_idx_cat_2.filter(x => !new_idx_cat_2.includes(x));
    const new_stim_cat_2 = exemplar_stimuli(stim_path, pack_ID, 2, new_idx_cat_2, block);
    const stim_cat_2 = new_stim_cat_2.concat(prev_stim_cat_2);

    block_stimuli = stim_cat_1.concat(stim_cat_2);

    var test_procedure = {
        timeline : [fixation, test_stim, test_choices, feedback],
        timeline_variables : block_stimuli,
        loop_function : function(){
            N = 20
            const reponses = jsPsych.data.get().filter({task: 'response'}).last(N).values();
            N_corrects = reponses.reduce((acc, x) => acc + x.correct, 0);
            accuracy = N_corrects / reponses.length;
            return (accuracy > 0.8) ? false : true;
        },
        randomize_order : true
    };
    timeline.push(test_procedure);
    
    prev_stim_cat_1 = stim_cat_1;
    prev_stim_cat_2 = stim_cat_2
}

jsPsych.run(timeline);
