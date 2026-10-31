#!/usr/bin/env python3
OPS = {
    (0x10, 0x00): (4, '', '', 0x412440),
    (0x10, 0x01): (4, '', '', 0x410b80),
    (0x10, 0x02): (4, '', '', 0x410ba0),
    (0x10, 0x04): (4, '', '', 0x410bd0),
    (0x10, 0x05): (8, 'b6 w2 w4', '', 0x410bf0),
    (0x10, 0x06): (8, 'b3 w4 w6', '', 0x410c90),
    (0x10, 0x07): (8, 'w4 w6', '', 0x410cd0),
    (0x10, 0x08): (8, 'w2 w4', '4', 0x410d30),
    (0x10, 0x09): (4, '', '', 0x410dc0),
    (0x10, 0x0a): (12, 'b2 d8 w4', '4', 0x410e50),
    (0x10, 0x0b): (4, '', '', 0x410ea0),
    (0x10, 0x0c): (4, 'w2', '', 0x410ec0),
    (0x10, 0x0d): (8, 'b2 b3 b4 d4 w4', '', 0x410f00),
    (0x10, 0x0e): (8, 'b2 b3 b4 d4 w4', '', 0x410f70),
    (0x10, 0x0f): (8, 'd4 w2', '', 0x410ff0),
    (0x10, 0x10): (4, 'b2 b3', '', 0x411020),
    (0x10, 0x11): (4, 'w2', '2', 0x411060),
    (0x10, 0x12): (4, 'w2', '2', 0x411090),
    (0x10, 0x13): (8, 'w2 w4', '', 0x4110f0),
    (0x10, 0x14): (8, 'w2 w4', '', 0x411130),
    (0x10, 0x15): (4, '', '', 0x4111b0),
    (0x10, 0x16): (8, 'd4 w2', '2', 0x411200),
    (0x10, 0x17): (4, 'w2', '2', 0x4112a0),
    (0x10, 0x18): (4, 'w2', '2', 0x4112f0),
    (0x10, 0x19): (4, 'w2', '2', 0x411370),
    (0x10, 0x1a): (4, 'w2', '2', 0x4113c0),
    (0x10, 0x1b): (8, 'w4', '', 0x411440),
    (0x10, 0x1c): (4, '', '', 0x411460),
    (0x10, 0x1d): (4, 'w2', '2', 0x411480),
    (0x10, 0x1e): (8, 'w2 w4', '', 0x4114c0),
    (0x10, 0x1f): (4, 'w2', '2', 0x411510),
    (0x10, 0x20): (8, 'w2 w4', '', 0x411590),
    (0x10, 0x21): (4, 'w2', '', 0x411620),
    (0x10, 0x22): (8, 'w4 w6', '', 0x411680),
    (0x10, 0x23): (8, 'w4 w6', '', 0x4116c0),
    (0x10, 0x24): (4, '', '', 0x411700),
    (0x10, 0x25): (4, 'w2', '', 0x411720),
    (0x10, 0x26): (8, 'w4 w6', '', 0x411760),
    (0x10, 0x27): (8, 'w4 w6', '', 0x4117a0),
    (0x10, 0x28): (4, 'w2', '', 0x4117e0),
    (0x10, 0x29): (4, 'b2 b3', '', 0x411810),
    (0x10, 0x2a): (8, 'w2 w4', '4', 0x411840),
    (0x10, 0x2b): (8, 'w2', '', 0x4118a0),
    (0x10, 0x2c): (4, 'w2', '', 0x411900),
    (0x10, 0x2d): (4, 'w2', '', 0x411940),
    (0x10, 0x2e): (4, 'w2', '', 0x411980),
    (0x10, 0x2f): (4, 'w2', '', 0x4119b0),
    (0x10, 0x30): (8, 'w2 w4', '', 0x4119e0),
    (0x10, 0x31): (8, 'w2 w4', '4', 0x411a30),
    (0x10, 0x32): (4, 'w2', '', 0x411af0),
    (0x10, 0x33): (4, 'w2', '', 0x411b20),
    (0x10, 0x34): (4, '', '', 0x411b50),
    (0x10, 0x35): (4, '', '', 0x411b80),
    (0x10, 0x36): (4, '', '', 0x411bd0),
    (0x10, 0x37): (4, 'd4 d8', '', 0x411c20),
    (0x10, 0x38): (4, 'd4 d8', '', 0x411c60),
    (0x10, 0x39): (4, '', '', 0x411ca0),
    (0x10, 0x3a): (4, 'b2 w2', '', 0x411cd0),
    (0x10, 0x3b): (4, 'w2', '', 0x411d10),
    (0x10, 0x3c): (4, 'w2', '', 0x411d40),
    (0x10, 0x3d): (4, '', '', 0x411d80),
    (0x10, 0x3e): (4, '', '', 0x411f70),
    (0x10, 0x3f): (4, '', '', 0x411f80),
    (0x10, 0x40): (12, 'b2 d4 w8', '', 0x411fa0),
    (0x11, 0x00): (4, 'w2', '', 0x408250),
    (0x11, 0x01): (8, 'd4 w2', '', 0x4082a0),
    (0x11, 0x02): (12, 'b2 w4 w6 w8', '6 8', 0x4082d0),
    (0x11, 0x03): (12, 'b2 w4 w6 w8 w10', '6', 0x4083b0),
    (0x11, 0x04): (12, 'b2 w4 w6 w8', '6 8', 0x408480),
    (0x11, 0x05): (12, 'b2 w4 w6 w8 w10', '6', 0x408560),
    (0x11, 0x06): (12, 'w2 w4 w6 w8', '8', 0x408630),
    (0x11, 0x07): (12, 'w2 w4 w6 w8 w10', '', 0x408750),
    (0x11, 0x08): (12, 'w2 w4 w6 w8', '8', 0x408870),
    (0x11, 0x09): (12, 'w2 w4 w6 w8 w10', '', 0x408900),
    (0x11, 0x0a): (4, 'w2', '', 0x408980),
    (0x11, 0x0b): (8, 'b4 w2', '', 0x4089b0),
    (0x11, 0x0c): (8, 'w2 w4', '4', 0x4089f0),
    (0x11, 0x0d): (8, 'w2 w4 w6', '', 0x408a50),
    (0x11, 0x0e): (8, 'w2 w4', '', 0x408ab0),
    (0x11, 0x0f): (8, 'b2 w4', '', 0x408af0),
    (0x11, 0x10): (4, '', '', 0x408b30),
    (0x11, 0x11): (8, 'b2 b3 b4', '', 0x408ba0),
    (0x11, 0x12): (4, 'b2 b3', '', 0x408da0),
    (0x11, 0x13): (4, '', '', 0x408e00),
    (0x11, 0x14): (8, 'b2', '', 0x408e30),
    (0x11, 0x15): (8, 'b2 b3 w4', '4', 0x408e80),
    (0x11, 0x16): (4, '', '', 0x408ed0),
    (0x11, 0x17): (4, 'b2', '', 0x408ef0),
    (0x11, 0x18): (4, 'b2', '', 0x408fa0),
    (0x11, 0x19): (4, 'b2', '', 0x409040),
    (0x11, 0x1a): (4, 'b2', '', 0x4090e0),
    (0x11, 0x1b): (4, 'b2', '', 0x409180),
    (0x11, 0x1c): (4, 'b2', '', 0x409220),
    (0x11, 0x1d): (4, 'b2', '', 0x4092c0),
    (0x11, 0x1e): (4, 'w2', '', 0x409360),
    (0x11, 0x1f): (12, 'b2 w4 w6 w8', '6 8', 0x409390),
    (0x11, 0x20): (12, 'b2 w4 w6 w8 w10', '6', 0x4094a0),
    (0x11, 0x21): (12, 'b2 w4 w6 w8', '6 8', 0x4095a0),
    (0x11, 0x22): (12, 'b2 w4 w6 w8 w10', '6', 0x4096b0),
    (0x11, 0x23): (12, 'w4 w6 w8 w10', '', 0x4097b0),
    (0x11, 0x24): (4, '', '', 0x4097f0),
    (0x11, 0x25): (4, '', '', 0x409820),
    (0x11, 0x26): (4, '', '', 0x409850),
    (0x11, 0x27): (4, 'w2', '', 0x409880),
    (0x11, 0x28): (8, 'w2', '', 0x4098f0),
    (0x11, 0x29): (4, 'w2', '', 0x409930),
    (0x11, 0x2a): (4, 'w2', '2', 0x409960),
    (0x11, 0x2b): (8, '', '', 0x4099e0),
    (0x11, 0x2c): (8, 'w2 w4', '4', 0x409a20),
    (0x11, 0x2d): (8, 'w2 w4', '4', 0x409ab0),
    (0x11, 0x2e): (4, 'b2', '', 0x409b40),
    (0x11, 0x2f): (12, 'w4 w6 w8 w10', '', 0x409ba0),
    (0x12, 0x00): (4, 'w2', '', 0x40b010),
    (0x12, 0x01): (4, '', '', 0x40b050),
    (0x12, 0x02): (4, '', '', 0x40b080),
    (0x12, 0x03): (4, '', '', 0x40b0b0),
    (0x12, 0x04): (4, '', '', 0x40b0e0),
    (0x12, 0x05): (4, '', '', 0x40b110),
    (0x12, 0x06): (4, '', '', 0x40b140),
    (0x12, 0x07): (4, '', '', 0x40b170),
    (0x12, 0x08): (4, '', '', 0x40b1a0),
    (0x12, 0x09): (4, '', '', 0x40b1d0),
    (0x12, 0x0a): (4, '', '', 0x40b1f0),
    (0x12, 0x0b): (4, '', '', 0x40b220),
    (0x12, 0x0c): (4, '', '', 0x40b250),
    (0x12, 0x0d): (4, '', '', 0x40b270),
    (0x12, 0x0e): (4, '', '', 0x40b2a0),
    (0x12, 0x0f): (4, '', '', 0x40b2d0),
    (0x12, 0x10): (8, 'w2 w4', '4', 0x40b300),
    (0x12, 0x11): (8, 'w2 w4', '4', 0x40b360),
    (0x12, 0x13): (4, 'w2', '', 0x40b830),
    (0x12, 0x14): (4, '', '', 0x40b3b0),
    (0x12, 0x18): (4, '', '', 0x40b470),
    (0x12, 0x19): (4, '', '', 0x40b490),
    (0x12, 0x1a): (4, '', '', 0x40b4b0),
    (0x12, 0x1c): (4, '', '', 0x40b4d0),
    (0x12, 0x1d): (4, '', '', 0x40b500),
    (0x12, 0x1e): (4, '', '', 0x40b530),
    (0x12, 0x1f): (4, '', '', 0x40b560),
    (0x12, 0x20): (4, 'w2', '', 0x40b590),
    (0x12, 0x21): (4, '', '', 0x40b5d0),
    (0x12, 0x22): (4, '', '', 0x40b5f0),
    (0x12, 0x23): (4, '', '', 0x40b610),
    (0x12, 0x26): (4, '', '', 0x40b630),
    (0x12, 0x27): (4, '', '', 0x40b660),
    (0x12, 0x28): (4, '', '', 0x40b6a0),
    (0x12, 0x29): (4, '', '', 0x40b6d0),
    (0x12, 0x2a): (4, '', '', 0x40b6f0),
    (0x12, 0x2b): (4, '', '', 0x40b720),
    (0x12, 0x2c): (4, '', '', 0x40b740),
    (0x12, 0x2d): (4, '', '', 0x40b760),
    (0x12, 0x2e): (4, '', '', 0x40b790),
    (0x12, 0x2f): (4, '', '', 0x40b7b0),
    (0x12, 0x30): (8, 'w2 w4', '4', 0x40b7d0),
    (0x12, 0x33): (4, 'w2', '', 0x40b830),
    (0x12, 0x34): (4, '', '', 0x40b860),
    (0x12, 0x35): (4, '', '', 0x40b900),
    (0x12, 0x40): (4, '', '', 0x40b910),
    (0x12, 0x42): (4, '', '', 0x40b930),
    (0x12, 0x44): (4, '', '', 0x40b960),
    (0x12, 0x45): (4, '', '', 0x40b990),
    (0x12, 0x46): (4, '', '', 0x40b9b0),
    (0x12, 0x47): (4, '', '', 0x40b9e0),
    (0x12, 0x48): (4, '', '', 0x40ba00),
    (0x12, 0x49): (4, '', '', 0x40ba20),
    (0x12, 0x4c): (8, 'w2 w4', '4', 0x40ba40),
    (0x12, 0x4d): (4, 'w2', '', 0x40ba90),
    (0x20, 0x00): (4, '', '', 0x418bd0),
    (0x20, 0x01): (4, '', '', 0x418c70),
    (0x20, 0x02): (4, '', '', 0x418da0),
    (0x20, 0x03): (4, '', '', 0x418e10),
    (0x20, 0x04): (4, '', '', 0x418f70),
    (0x20, 0x05): (4, '', '', 0x419000),
    (0x20, 0x06): (4, '', '', 0x419040),
    (0x20, 0x07): (4, '', '', 0x4190e0),
    (0x20, 0x08): (4, 'b2', '', 0x419820),
    (0x20, 0x09): (4, '', '', 0x419e90),
    (0x20, 0x0a): (4, '', '', 0x419f30),
    (0x20, 0x0b): (4, '', '', 0x41a120),
    (0x20, 0x0c): (4, '', '', 0x41a1b0),
    (0x20, 0x0d): (4, '', '', 0x41a300),
    (0x20, 0x0e): (4, 'w2', '2', 0x41a3f0),
    (0x20, 0x0f): (12, 'd8 w4 w6', '', 0x41a4d0),
    (0x20, 0x10): (4, '', '', 0x41a5d0),
    (0x20, 0x11): (4, '', '', 0x41a850),
    (0x20, 0x12): (4, '', '', 0x41aa20),
    (0x20, 0x13): (4, '', '', 0x41aea0),
    (0x20, 0x14): (4, '', '', 0x41b310),
    (0x20, 0x15): (4, '', '', 0x41b910),
    (0x20, 0x16): (4, 'b2 d400', '', 0x41c330),
    (0x20, 0x17): (4, 'b2', '', 0x41c800),
    (0x20, 0x18): (4, 'b2', '', 0x41ca20),
    (0x20, 0x19): (4, '', '', 0x41cd40),
    (0x20, 0x1a): (4, 'b2', '', 0x41d750),
    (0x20, 0x1b): (4, '', '', 0x41d980),
    (0x20, 0x1c): (4, '', '', 0x41d9b0),
    (0x20, 0x1d): (4, 'w2', '2', 0x41dcd0),
    (0x20, 0x1e): (4, 'b2', '', 0x41de50),
    (0x20, 0x1f): (4, 'b2', '', 0x41e1f0),
    (0x20, 0x20): (4, 'b2', '', 0x41e7a0),
    (0x20, 0x21): (4, 'b2', '', 0x41ecf0),
    (0x20, 0x22): (4, 'b2', '', 0x41ef60),
    (0x20, 0x23): (4, 'b2', '', 0x41f790),
    (0x20, 0x24): (4, '', '', 0x41fb80),
    (0x20, 0x25): (4, 'b2', '', 0x420180),
    (0x20, 0x26): (4, '', '', 0x420440),
    (0x20, 0x27): (4, 'b2', '', 0x420680),
    (0x20, 0x28): (4, '', '', 0x420a40),
    (0x20, 0x29): (4, '', '', 0x420ae0),
    (0x20, 0x2a): (4, 'w2', '', 0x420e00),
    (0x20, 0x2b): (4, '', '', 0x420e30),
    (0xa0, 0x00): (4, '', '', 0x405720),
    (0xa0, 0x01): (4, 'w2', '2', 0x405800),
    (0xa0, 0x03): (4, '', '', 0x405740),
    (0xa0, 0x04): (4, '', '', 0x405760),
    (0xa0, 0x05): (4, '', '', 0x4057a0),
    (0xa0, 0x06): (4, '', '', 0x4057c0),
    (0xa0, 0x07): (4, '', '', 0x405780),
    (0xa0, 0x08): (12, 'b2 w4 d8', '4', 0x405840),
    (0xa0, 0x09): (4, '', '', 0x4058d0),
    (0xa0, 0x0a): (4, '', '', 0x4057e0),
    (0xa0, 0x0b): (4, 'b2', '', 0x4058f0),
}

NAMES = {
    (0x10, 0x00): 'kill', (0x10, 0x01): 'quit', (0x10, 0x10): 'list_op', (0x10, 0x04): 'gettime',
    (0x10, 0x05): 'spawn', (0x10, 0x08): 'load_sq', (0x10, 0x09): 'poll_input',
    (0x10, 0x0a): 'jkey', (0x10, 0x0b): 'yield', (0x10, 0x0c): 'wait',
    (0x10, 0x0d): 'setvar', (0x10, 0x0e): 'setobj', (0x10, 0x0f): 'setglobal',
    (0x10, 0x11): 'jmp', (0x10, 0x12): 'call', (0x10, 0x13): 'xjmp', (0x10, 0x14): 'xcall',
    (0x10, 0x15): 'ret', (0x10, 0x16): 'loop', (0x10, 0x17): 'jtab', (0x10, 0x18): 'ctab',
    (0x10, 0x19): 'xjtab', (0x10, 0x1a): 'xctab', (0x10, 0x1b): 'setres', (0x10, 0x1c): 'jidx',
    (0x10, 0x1d): 'jnz', (0x10, 0x1e): 'xjnz', (0x10, 0x1f): 'cnz', (0x10, 0x20): 'xcnz',
    (0x10, 0x2a): 'jflag', (0x10, 0x2b): 'jnflag', (0x10, 0x2c): 'waitnflag', (0x10, 0x2d): 'waitflag',
    (0x10, 0x2e): 'setflag', (0x10, 0x2f): 'clrflag', (0x10, 0x30): 'cpflag',
    (0x10, 0x31): 'load_sq_lang', (0x10, 0x3e): 'idle', (0x10, 0x3f): 'self',
    (0x10, 0x40): 'waitkey',
    (0x10, 0x35): 'unlink_a', (0x10, 0x36): 'unlink_b', (0x10, 0x37): 'link_before', (0x10, 0x38): 'link_after',
    (0x11, 0x00): 'anim_start', (0x11, 0x01): 'frame', (0x11, 0x06): 'surf_new_tbl', (0x11, 0x07): 'surf_new_grid',
    (0x11, 0x08): 'surf_new_tbl_sys', (0x11, 0x09): 'surf_new_grid_sys', (0x11, 0x0a): 'surf_free',
    (0x11, 0x0b): 'surf_fill', (0x11, 0x0c): 'frames_tbl', (0x11, 0x0d): 'frames_grid', (0x11, 0x0f): 'colorkey',
    (0x11, 0x10): 'dirty_self', (0x11, 0x11): 'fade_step', (0x11, 0x12): 'fade_begin', (0x11, 0x13): 'fade_end',
    (0x11, 0x14): 'pal_set', (0x11, 0x15): 'pal_table', (0x11, 0x16): 'pal_apply', (0x11, 0x17): 'move_step',
    (0x11, 0x18): 'trig_set', (0x11, 0x19): 'trig_add', (0x11, 0x1a): 'trig_set_b', (0x11, 0x1b): 'trig_sub_b',
    (0x11, 0x1c): 'trig_set_c', (0x11, 0x1d): 'trig_add_c', (0x11, 0x1e): 'skip_limit', (0x11, 0x23): 'hitrect',
    (0x11, 0x24): 'hitrect_img', (0x11, 0x25): 'hit_point', (0x11, 0x26): 'hit_obj', (0x11, 0x28): 'pal_bank_new',
    (0x11, 0x29): 'pal_bank_free', (0x11, 0x2a): 'pal_from_table', (0x11, 0x2c): 'pal_file', (0x11, 0x2d): 'pal_file_b',
    (0x11, 0x2f): 'dirty_rect',
    (0x11, 0x27): 'find_obj', (0x11, 0x2e): 'sync',
    (0x12, 0x00): 'wav_create', (0x12, 0x01): 'wav_free', (0x12, 0x02): 'wav_stop', (0x12, 0x03): 'wav_play',
    (0x12, 0x04): 'wav_volume', (0x12, 0x10): 'wavbank_load', (0x12, 0x13): 'mid_free', (0x12, 0x20): 'mid_play',
    (0x12, 0x21): 'mid_stop', (0x12, 0x26): 'mid_volume', (0x12, 0x27): 'mid_getvol', (0x12, 0x30): 'mid_load',
    (0x12, 0x33): 'mid_free',
    (0x11, 0x02): 'gfx_load_tbl', (0x11, 0x03): 'gfx_load_grid', (0x11, 0x04): 'gfx_load_tbl_sys', (0x11, 0x05): 'gfx_load_grid_sys',
    (0x11, 0x1f): 'gfx_load_lang_tbl', (0x11, 0x20): 'gfx_load_lang_grid', (0x11, 0x21): 'gfx_load_lang_tbl_sys',
    (0x11, 0x22): 'gfx_load_lang_grid_sys',
    (0xa0, 0x01): 'jnz_a0', (0x20, 0x0e): 'yaku_load', (0xa0, 0x08): 'ckey_a0', (0xa0, 0x09): 'clr_a0',
}
TEXT = {(0x10, 0x08): 4, (0x10, 0x31): 4, (0x11, 0x02): 6, (0x11, 0x03): 6, (0x11, 0x04): 6, (0x11, 0x05): 6,
        (0x11, 0x1f): 6, (0x11, 0x20): 6, (0x11, 0x21): 6, (0x11, 0x22): 6, (0x11, 0x2c): 4, (0x11, 0x2d): 4,
        (0x12, 0x10): 4, (0x12, 0x11): 4, (0x12, 0x30): 4, (0x12, 0x4c): 4}
SLOT = {(0x10, 0x05): (2, 4), (0x10, 0x13): (2, 4), (0x10, 0x14): (2, 4), (0x10, 0x1e): (2, 4), (0x10, 0x20): (2, 4),
        (0x10, 0x08): (2, None), (0x10, 0x31): (2, None)}
FIXED = {(0x10, 0x05): 'S2 X4 b6', (0x10, 0x13): 'S2 X4', (0x10, 0x14): 'S2 X4', (0x10, 0x1e): 'S2 X4',
         (0x10, 0x20): 'S2 X4', (0x10, 0x08): 'S2 T4', (0x10, 0x31): 'S2 T4', (0x10, 0x0a): 'b2 E4 d8',
         (0x10, 0x2a): 'w2 E4', (0x10, 0x2b): 'w2 E4', (0x10, 0x16): 'E2 d4', (0x10, 0x0f): 'g2 d4', (0x10, 0x40): 'b2 d4 w8', (0x10, 0x0c): 'w2'}
BASE_LEN = {0: 4, 1: 8, 2: 8, 3: 12, 4: 12, 5: 12, 6: 8, 7: 8, 8: 8, 9: 12, 10: 12, 11: 12, 12: 8}
LD = {0x11: 'not', 0x12: 'var', 0x16: 'obj', 0x17: 'entry', 0x18: 'glob', 0x19: 'flag', 0x1d: 'sys', 0x20: 'imm'}
BIN = {2: '*', 3: '/', 4: '+', 5: '-', 6: '<<', 7: '>>', 8: '<', 9: '<=', 10: '>', 11: '>=', 12: '==', 13: '!=',
       14: '&', 15: '^', 16: '|', 0x1e: 'mem', 0x1f: 'entryaddr'}
ST = {0x12: 'var', 0x16: 'obj', 0x18: 'glob', 0x19: 'flag', 0x1e: 'mem'}
SYS0 = {0x1a: 'stick', 0x1b: 'key_edge', 0x1c: 'key_held'}


def u16(d, o): return int.from_bytes(d[o:o + 2], 'little')
def u32(d, o): return int.from_bytes(d[o:o + 4], 'little')


class Bad(Exception):
    pass


def parse_fields(spec):
    out = []
    for t in spec.split():
        out.append((t[0], int(t[1:])))
    return out


def decode(d, o, end):
    c = d[o]
    if c < 0x10:
        if c > 12:
            raise Bad('undefined base op')
        n = BASE_LEN[c]
        if o + n > end:
            raise Bad('overrun')
        return ('base', c, n)
    if c not in (0x10, 0x11, 0x12, 0x20, 0xa0):
        raise Bad('unknown class %02x' % c)
    i = d[o + 1]
    key = (c, i)
    if key not in OPS:
        raise Bad('undefined op %02x%02x' % key)
    n = OPS[key][0]
    if o + n > end:
        raise Bad('overrun')
    return ('ext', key, n)


def sub_name(tab, v):
    return tab.get(v, '0x%02x' % v)


def fmt_base(d, o, c, n):
    sub = d[o + 1]
    r = u16(d, o + 2)
    R = lambda x: 'R%d' % x
    if c == 0:
        return 'ldsys', '%s, %s' % (R(r), SYS0.get(sub, 'sys%02x' % sub))
    if c == 1:
        return 'ld', '%s, %s %d' % (R(r), sub_name(LD, sub), u32(d, o + 4))
    if c == 2:
        return 'ld', '%s, %s %s' % (R(r), sub_name(LD, sub), R(u16(d, o + 4)))
    a = {3: R(u16(d, o + 4)), 4: str(u32(d, o + 4)), 5: str(u32(d, o + 4)), 6: R(u16(d, o + 4))}
    b = {3: str(u32(d, o + 8)), 4: str(u32(d, o + 8)), 5: R(u16(d, o + 8)), 6: R(u16(d, o + 6))}
    if c in a:
        return 'bin', '%s, %s %s %s' % (R(r), a[c], sub_name(BIN, sub), b[c])
    if c == 7:
        return 'st', '%s %d, %s' % (sub_name(ST, sub), u32(d, o + 4), R(r))
    if c == 8:
        return 'st', '%s %s, %s' % (sub_name(ST, sub), R(u16(d, o + 4)), R(r))
    base, idx = {9: (R(u16(d, o + 4)), str(u32(d, o + 8))), 10: (str(u32(d, o + 4)), str(u32(d, o + 8))),
                 11: (str(u32(d, o + 4)), R(u16(d, o + 8))), 12: (R(u16(d, o + 4)), R(u16(d, o + 6)))}[c]
    return 'stx', '[%s + %s*4], %s' % (base, idx, R(r))


def fmt_ext(d, o, key, n, ctx):
    c, i = key
    L, fs, ent, addr = OPS[key]
    name = NAMES.get(key, 'op_%02x%02x' % key)
    if key in ((0x10, 0x0d), (0x10, 0x0e)):
        kind = d[o + 3]
        v = {1: d[o + 4], 2: u16(d, o + 4), 4: u32(d, o + 4)}.get(kind)
        return name, 'r%d, %s' % (d[o + 2], 'size%d:%d' % (kind, v) if v is not None else 'kind%d' % kind), []
    spec = FIXED.get(key)
    if spec is None:
        toks = parse_fields(fs)
        have = {}
        for k, off in toks:
            have.setdefault(off, set()).add(k)
        used = []
        for off in sorted(have):
            ks = have[off]
            if off in [int(x) for x in ent.split()]:
                used.append('E%d' % off)
            elif 'd' in ks:
                used.append('d%d' % off)
            elif 'w' in ks:
                used.append('w%d' % off)
            else:
                used.append('b%d' % off)
        covered = set()
        for t in used:
            w = 4 if t[0] == 'd' else 2 if t[0] in 'wE' else 1
            covered |= set(range(int(t[1:]), int(t[1:]) + w))
        if not used and n == 4 and (d[o + 2] or d[o + 3]):
            used = ['b2', 'b3']
        spec = ' '.join(used)
        if key in TEXT:
            spec = spec.replace('E%d' % TEXT[key], 'T%d' % TEXT[key])
    parts = []
    refs = []
    for t in spec.split():
        k, off = t[0], int(t[1:])
        if k == 'b':
            parts.append('%d' % d[o + off])
        elif k == 'w':
            parts.append('%d' % u16(d, o + off))
        elif k == 'd':
            parts.append('%d' % u32(d, o + off))
        elif k == 'g':
            parts.append('G%d' % u16(d, o + off))
        elif k == 'S':
            parts.append('slot%d' % u16(d, o + off))
        elif k == 'X':
            parts.append('X%d' % u16(d, o + off))
        elif k in 'ET':
            v = u16(d, o + off)
            parts.append('E%d' % v)
            refs.append((k, v))
    return name, ', '.join(parts), refs


def entries(d):
    first = u32(d, 0)
    n = first // 4
    offs = [u32(d, 4 * i) for i in range(n)]
    srt = sorted(set(offs) | {len(d)})
    ends = []
    for x in offs:
        ends.append(srt[srt.index(x) + 1])
    return offs, ends


def as_text(d, a, b):
    raw = d[a:b]
    z = raw.find(b'\0')
    if z < 0 or any(x for x in raw[z:]):
        return None
    s = raw[:z]
    if not s or s[0] < 0x20:
        return None
    try:
        t = s.decode('cp932')
    except UnicodeDecodeError:
        return None
    if any(ord(ch) < 0x20 for ch in t):
        return None
    return t


def disassemble(path):
    d = open(path, 'rb').read()
    offs, ends = entries(d)
    n = len(offs)
    decoded = {}
    for i in range(n):
        a, b = offs[i], ends[i]
        ins = []
        o = a
        try:
            while o < b:
                if b == len(d) and b - o < 4 and not any(d[o:b]) and ins:
                    ins.append((o, ('pad', None, b - o)))
                    o = b
                    break
                r = decode(d, o, b)
                ins.append((o, r))
                o += r[-1]
            if o != b:
                raise Bad('misaligned')
            decoded[i] = ins
        except Bad:
            decoded[i] = None
    tabs16, tabs32 = set(), set()
    for i in range(n):
        for o, r in decoded[i] or []:
            if r[0] == 'ext' and r[1] in ((0x10, 0x17), (0x10, 0x18)):
                tabs16.add(u16(d, o + 2))
            if r[0] == 'ext' and r[1] in ((0x10, 0x19), (0x10, 0x1a)):
                tabs32.add(u16(d, o + 2))
    texts = {}
    for i in range(n):
        t = as_text(d, offs[i], ends[i])
        if t is not None:
            texts[i] = t
    out = []
    stats = {'ins': 0, 'op_unknown': 0, 'entries': n, 'code': 0, 'data': 0, 'text': 0, 'badref': 0}
    for i in range(n):
        a, b = offs[i], ends[i]
        out.append('')
        kind = 'code' if decoded[i] is not None and not (i in texts and (not decoded[i] or decoded[i][0][1][0] == 'ext' and False)) else 'data'
        if i in texts and decoded[i] is None:
            kind = 'text'
        out.append('; entry %d  [%06x..%06x)  %s' % (i, a, b, kind if a != b else 'empty'))
        if a == b:
            continue
        if kind == 'code':
            stats['code'] += 1
            for o, r in decoded[i]:
                raw = d[o:o + r[-1]].hex(' ')
                if r[0] == 'pad':
                    out.append('%06x  %-30s  .pad' % (o, raw))
                    continue
                if r[0] == 'base':
                    m, ops = fmt_base(d, o, r[1], r[2])
                    refs = []
                else:
                    m, ops, refs = fmt_ext(d, o, r[1], r[2], None)
                    if m.startswith('op_'):
                        stats['op_unknown'] += 1
                note = ''
                for k, v in refs:
                    if v >= n:
                        stats['badref'] += 1
                        note += '  ; E%d out of table' % v
                    elif k == 'T':
                        if v in texts:
                            note += '  ; E%d = %r' % (v, texts[v])
                        else:
                            stats['badref'] += 1
                            note += '  ; E%d is not text' % v
                stats['ins'] += 1
                out.append('%06x  %-30s  %-10s %s%s' % (o, raw, m, ops, note))
        elif kind == 'text':
            stats['text'] += 1
            out.append('%06x  %-30s  .asciz     %s' % (a, d[a:min(b, a + 10)].hex(' '), repr(texts[i])))
        else:
            stats['data'] += 1
            o = a
            w = 2 if i in tabs16 else 4
            if (b - a) % w:
                w = 1
            per = 16 // w if w > 1 else 16
            while o < b:
                chunk = d[o:min(b, o + per * w)]
                vals = ' '.join('%d' % int.from_bytes(chunk[k:k + w], 'little') for k in range(0, len(chunk), w))
                out.append('%06x  %-30s  .%s %s' % (o, chunk[:10].hex(' '), {1: 'byte', 2: 'u16', 4: 'u32'}[w], vals))
                o += per * w
    return out, stats


def main():
    import sys
    if len(sys.argv) < 2:
        sys.exit('usage: sqdis.py file.sq')
    out, st = disassemble(sys.argv[1])
    print('; %s' % sys.argv[1].replace('\\', '/').split('/')[-1])
    print('\n'.join(out))
    print('\n; ' + ' '.join('%s=%s' % kv for kv in st.items()), file=sys.stderr)


if __name__ == '__main__':
    main()
