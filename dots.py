import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from matplotlib.collections import PatchCollection
from itertools import permutations

import os 

def gen_folder_name(name, current_ID = 1):
    folder_name = f"{name}_{current_ID}"
    c = current_ID
    while os.path.isdir(folder_name):
        c += 1
        folder_name = f"{name}_{c}"
    return folder_name

def check_within(new_dot, prototype):
    thrs = 2
    x_new, y_new = new_dot
    for dot in prototype:
        x, y = dot
        dist = np.linalg.norm([x - x_new, y - y_new], ord=1)
        if dist < thrs:
            return True
    return False

def check_across(P_new, 
                 Ps, 
                 thrs_dot = 2.5, 
                 N_thrs_dots = 3, 
                 llim_avg = -np.inf, 
                 ulim_avg = np.inf
):
    N_dots = P_new.shape[0]
    perms_iter = permutations(range(0, N_dots))
    perms_list = []
    for p in perms_iter:
        perms_list.append(p)
    perms = np.array(perms_list)

    for prototype in Ps:
        dists = np.zeros(perms.shape)
        for (i, dot) in enumerate(prototype):
            x, y = dot
            for (j, dot_new) in enumerate(P_new):
                x_new, y_new = dot_new  
                d = np.linalg.norm([x - x_new, y - y_new], ord=1)
                idx = np.where(perms[:, j] == i)
                dists[idx, j] = d
        dist_perms = np.sum(dists, 1)
        idx_min = np.where(dist_perms == np.min(dist_perms))
        dist_min = dists[idx_min, :]
        avg_dist = np.sum(dist_min) / N_dots

        count_above_thrs = len(np.where(dist_min < thrs_dot)[0])
        if (avg_dist <= llim_avg) or (avg_dist >= ulim_avg) or (count_above_thrs > N_thrs_dots):
            return True
        
    return False

def gen_prototype(N_dots, sz_grid):
    width, height = sz_grid
    P = np.zeros((N_dots, 2))

    for i in range(N_dots):
        x = np.random.randint(0, width)
        y = np.random.randint(0, height)
        while check_within([x, y], P[:i, :]):
            x = np.random.randint(0, width)
            y = np.random.randint(0, height)
        P[i] = [x, y]    

    return P

def gen_prototypes(N_prototypes, N_dots, sz_grid):
    Ps = np.zeros((N_prototypes, N_dots, 2))

    is_bad_prototypes = True
    while is_bad_prototypes:
        is_bad_prototypes = False
        Ps[0, :, :] = gen_prototype(N_dots, sz_grid)
        for i in range(1, N_prototypes):
            Ps[i, :, :] = gen_prototype(N_dots, sz_grid)
            if not check_across(Ps[i,:,:], Ps[:i,:,:], llim_avg=4, ulim_avg=5.5):
                is_bad_prototypes = True
                break
        
    """
    for k in range(1, N_prototypes):
        while True :
            Ps[k, :, :] = gen_prototype(N_dots, sz_grid)

            if not check_across(Ps[k,:,:], Ps[:k,:,:], llim_avg=4, ulim_avg=5.5):
                break
    """
    return Ps

def gen_exemplar(prototype):
    probs = [0.63, 0.19, 0.13, 0.03, 0.02]
    #probs = [0.59, 0.20, 0.16, 0.03, 0.02]
    exemplar = np.zeros(prototype.shape)

    for (i, dot) in enumerate(prototype):
        offset = np.random.choice(range(1, len(probs) + 1), p = probs)
        idx_offset = np.random.choice([0, 1])

        dot_exemplar = np.copy(dot)
        dot_exemplar[idx_offset] += np.random.choice([-offset, offset])
        dot_exemplar[not idx_offset] += np.random.randint(-offset, offset + 1)

        while check_within(dot_exemplar, exemplar[:i]):
            dot_exemplar = np.copy(dot)
            dot_exemplar[idx_offset] += np.random.choice([-offset, offset])
            dot_exemplar[not idx_offset] += np.random.randint(-offset, offset + 1)
        exemplar[i, :] = dot_exemplar

    return exemplar
        
def gen_exemplars(N_exemplars, prototype):
    exs = np.zeros((N_exemplars, prototype.shape[0], prototype.shape[1]))

    is_bad_exemplars = True
    while is_bad_exemplars:
        is_bad_exemplars = False
        exs[0, :, :] = gen_exemplar(prototype)
        for i in range(1, N_exemplars):
            exs[i, :, :] = gen_exemplar(prototype)
            if not check_across(exs[i,:,:], exs[:i,:,:], llim_avg=5.1, ulim_avg=7.1):
                is_bad_exemplars = True
                break
    """"
    exs[0, :, :] = gen_exemplar(prototype)

    for k in range(1, N_exemplars):
        while True :
            exs[k, :, :] = gen_exemplar(prototype)

            if not check_across(exs[k,:,:], exs[:k,:,:], N_thrs_dots=2):
                break
    """
    return exs


def plot(P, sz_grid, filename, show=False, save=True):
    fig, ax = plt.subplots(figsize=(5,5))

    dots = [Circle((dot[0], dot[1]), radius=0.5) for dot in P]
    c = PatchCollection(dots, color='k')
    ax.add_collection(c)

    lims = np.array([-6, 6]) + np.array([0, sz_grid[0]]) # assuming square grid
    ax.set_xlim(*lims)
    ax.set_ylim(*lims)
    plt.axis('off')

    if save:
        plt.savefig(filename + '.png')
    if show:
        plt.show()

    plt.close(fig)

N_prototypes = 2
N_dots = 7
N_exemplars = 129
sz_grid = (20, 20)

Ps = gen_prototypes(N_prototypes, N_dots, sz_grid)

exs = np.zeros((N_prototypes, N_exemplars, N_dots, 2))
for i in range(0, N_prototypes):
    exs[i,:,:,:] = gen_exemplars(N_exemplars, Ps[i,:,:])

pack_name = gen_folder_name('pack')
os.mkdir(pack_name)

for i in range(0, N_prototypes):
    cat_name = gen_folder_name(pack_name + "/cat", 1)
    os.mkdir(cat_name)

    ID_prototype = cat_name.split("_")[-1]
    file_name = cat_name + "/prot_" + ID_prototype
    plot(Ps[i,:,:], sz_grid, file_name)

    for j in range(0, N_exemplars):
        file_name = cat_name + "/ex_" + ID_prototype + f"_{j+1}"
        plot(exs[i,j,:,:], sz_grid, file_name)
