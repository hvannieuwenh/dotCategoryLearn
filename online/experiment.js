function wrap_choices_in_html(stimuli){
    txt = `
    <div>
        <div style="position: absolute; left: 20vw; top: 38vh;">
            <img src=${stimuli[0]} style="width: 22vw"></img>
        </div>
        <div style="position: absolute; right: 20vw; top: 38vh;">
            <img src=${stimuli[1]} style="width: 20vw"></img>
        </div>
    </div>
    `
    return txt
}

function wrap_stim_in_html(stimulus){
    txt = `
    <div style="margin: 0 auto">
        <img src=${stimulus} style="width: 20vw"></img>
    </div>
    `
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

N_blocks = 3
N_stim_packs = 2
N_exemplars = 129

var jsPsych = initJsPsych();

var pack_ID = jsPsych.randomization.sampleWithoutReplacement(range(1, N_stim_packs), 1)[0]

var stim_path = "../stimuli/" ;
var choice_stimuli = [stim_path + "A.png", stim_path + "B.png"]

const stimuli_cat_1 = Array.from(
    {length: N_exemplars}, 
    (_, i) => ({
        stimulus: `../stimuli/pack_${pack_ID}/cat_1/ex_1_${i+1}.png`, 
        correct_response: `ArrowLeft`
    })
);

const stimuli_cat_2 = Array.from(
    {length: N_exemplars}, 
    (_, i) => ({
        stimulus: `../stimuli/pack_${pack_ID}/cat_2/ex_2_${i+1}.png`, 
        correct_response: `ArrowRight`
    })
);

var stimuli_blocks = [];
var idx_cat_1_excluded = [];
var idx_cat_2_excluded = [];

for (i of range(0, N_blocks)){
    const idx_cat_1 = jsPsych.randomization.sampleWithoutReplacement(range(1, N_exemplars), 2**i);
    const idx_cat_2 = jsPsych.randomization.sampleWithoutReplacement(range(1, N_exemplars), 2**i);
    const stim_cat_1 = idx_cat_1.map(idx => stimuli_cat_1.at(idx))
    const stim_cat_2 = idx_cat_2.map(idx => stimuli_cat_2.at(idx))
    stimuli_blocks.push(stim_cat_1.concat(stim_cat_2));
}

//const diff = A.filter(x => !B.includes(x));

const stimuli = stimuli_blocks[0]

var timeline = [];

var welcome = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "Welcome to the dotCategoryLearn experiment! Press any key to continue."
};
timeline.push(welcome)

var instructions = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>You will be shown a collection of dots. Each set of dots will belong to one of two categories: category A or category B.<br>You will not know in advance which category the given set of dots belongs to.</br></p><p>When you are shown a set of dots, categorize them into category A (left arrow key) or category B (right arrow key)</br>as quickly as possible. You will receive feedback on whether or not your categorization was correct.</p><p>Your goal is to categorize as many sets of dots correctly as possible.</p><p>Press any key to begin.</p>"
};
timeline.push(instructions)

var preload = {
    type: jsPsychPreload,
    images: function(){
        stimuli.map(x => x.stimulus)
    }
};
timeline.push(preload);

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
    data: {}
};

var test_choices = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function(){
        return wrap_choices_in_html(choice_stimuli)
    },
    choices: ['ArrowLeft', 'ArrowRight'],
    data: {
        task: 'response',
        correct_response: jsPsych.timelineVariable('correct_response')
    },
    on_finish: function(data){
        data.correct = jsPsych.pluginAPI.compareKeys(data.response, data.correct_response);
    }
};

var feedback = {
    type: jsPsychHtmlKeyboardResponse,
    trial_duration: 1000,
    stimulus: function(){
        var last_trial_correct = jsPsych.data.get().last(1).values()[0].correct;
        if(last_trial_correct){
            return "<p>Correct!</p>";
        } else {
            return "<p>Wrong.</p>";
        }
    }
};

var test_procedure = {
    timeline : [fixation, test_stim, test_choices, feedback],
    timeline_variables : stimuli,
    loop_function : function(data){
        N = 20
        const d = jsPsych.data.get().filter({task: 'response'}).last(N).values();
        N_corrects = d.reduce((acc, x) => acc + x.correct, 0);
        acc = N_corrects / d.length;
        return (acc > 0.8) ? false : true;
    },
    randomize_order : true
};
timeline.push(test_procedure);

jsPsych.run(timeline);
